const axios = require('axios');
require('dotenv').config();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20000; // 20s — Groq is usually fast, but don't hang the UI forever
const MAX_ATTEMPTS = 2; // 1 retry on transient failure

// Custom error so routes can tell "LLM service unreachable/slow" apart from other errors
class LLMServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'LLMServiceError';
    this.cause = cause;
  }
}

/**
 * Strips markdown code fences etc. and parses JSON safely.
 * Groq's json_object mode is usually clean, but this guards against
 * stray formatting so we never crash on JSON.parse.
 */
function safeParseJSON(rawContent) {
  let cleaned = rawContent.trim();
  // Strip ```json ... ``` or ``` ... ``` wrappers if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new LLMServiceError('The tutor service returned an unexpected response. Please try again.', err);
  }
}

/**
 * Calls the Groq chat completions endpoint with a timeout and one retry
 * on network/5xx/timeout failures. Does NOT retry on 4xx (bad request/auth)
 * since retrying won't help there.
 */
async function callGroq(messages, temperature) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model: 'openai/gpt-oss-120b',
          messages,
          temperature,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: REQUEST_TIMEOUT_MS
        }
      );

      const content = response?.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new LLMServiceError('The tutor service returned an empty response. Please try again.');
      }
      return content;

    } catch (err) {
      lastError = err;

      // Don't retry on 4xx (bad API key, bad request) — retrying won't fix it
      const status = err.response?.status;
      const isClientError = status >= 400 && status < 500;
      const isLastAttempt = attempt === MAX_ATTEMPTS;

      if (isClientError || isLastAttempt) {
        break;
      }
      // else: transient (timeout, network error, 5xx) — loop again
    }
  }

  // All attempts failed — normalize into a friendly LLMServiceError
  if (lastError.code === 'ECONNABORTED') {
    throw new LLMServiceError('The tutor service is taking too long to respond. Please try again in a moment.', lastError);
  }
  if (lastError.response?.status === 401 || lastError.response?.status === 403) {
    throw new LLMServiceError('The tutor service is not configured correctly. Please contact support.', lastError);
  }
  throw new LLMServiceError('The tutor service is temporarily unavailable. Please try again shortly.', lastError);
}

async function getChemistryExplanation(studentQuestion, curriculumTopics) {
  const topicList = curriculumTopics.map(t => `- ${t.grade}: ${t.topic}`).join('\n');

  const systemPrompt = `You are a Chemistry tutor for Kenyan high school students (Form 1-4). 
You must ONLY answer questions related to Chemistry. If the question is unrelated to Chemistry, politely say so.
Here is the curriculum you are aligned to:
${topicList}

When answering:
1. Identify which curriculum topic the question relates to (pick the closest match from the list above).
2. Give a clear, simple explanation suitable for a high school student. If the student's question has multiple parts (e.g. asks "what is X and what are the types of X"), make sure your explanation addresses every part - do not answer only the first part.
3. Provide one short example.
4. End with one practice question related to the topic.

Formatting rule: never use LaTeX, underscore, or curly-brace notation for chemical formulas (e.g. do NOT write C_nH_{2n+2}). Instead use plain-text subscript/superscript characters directly, for example: CₙH₂ₙ₊₂, H₂O, Na⁺, SO₄²⁻.

Respond in this exact JSON format, nothing else:
{
  "matched_topic": "the topic name",
  "explanation": "your explanation here",
  "example": "your example here",
  "practice_question": "your practice question here"
}`;

  const content = await callGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: studentQuestion }
    ],
    0.4
  );

  const parsed = safeParseJSON(content);

  // Guard against missing fields so the frontend never renders "undefined"
  const required = ['matched_topic', 'explanation', 'example', 'practice_question'];
  const missing = required.filter(field => !parsed[field]);
  if (missing.length > 0) {
    throw new LLMServiceError(`The tutor service response was incomplete (missing: ${missing.join(', ')}). Please try again.`);
  }

  return parsed;
}

async function generateQuiz(topicName, numQuestions = 3) {
  const systemPrompt = `You are a Chemistry quiz generator for Kenyan high school students.
Generate ${numQuestions} multiple-choice questions about the topic: "${topicName}".
Each question must have exactly 4 options (A, B, C, D) and one correct answer.

Formatting rule: never use LaTeX, underscore, or curly-brace notation for chemical formulas (e.g. do NOT write C_nH_{2n+2}). Instead use plain-text subscript/superscript characters directly, for example: CₙH₂ₙ₊₂, H₂O, Na⁺, SO₄²⁻.

Respond in this exact JSON format, nothing else:
{
  "questions": [
    {
      "question_text": "the question",
      "option_a": "option A text",
      "option_b": "option B text",
      "option_c": "option C text",
      "option_d": "option D text",
      "correct_option": "A"
    }
  ]
}`;

  const content = await callGroq(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate the quiz for: ${topicName}` }
    ],
    0.5
  );

  const parsed = safeParseJSON(content);

  // Validate shape before it reaches the DB insert / frontend
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new LLMServiceError('The tutor service did not return any quiz questions. Please try again.');
  }

  const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'];
  const validOptions = ['A', 'B', 'C', 'D'];

  for (const [i, q] of parsed.questions.entries()) {
    const missing = requiredFields.filter(field => !q[field]);
    if (missing.length > 0) {
      throw new LLMServiceError(`Quiz question ${i + 1} was malformed (missing: ${missing.join(', ')}). Please try again.`);
    }
    if (!validOptions.includes(q.correct_option)) {
      throw new LLMServiceError(`Quiz question ${i + 1} had an invalid correct_option. Please try again.`);
    }
  }

  return parsed;
}

module.exports = { getChemistryExplanation, generateQuiz, LLMServiceError };