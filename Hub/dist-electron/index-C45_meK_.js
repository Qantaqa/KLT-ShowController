var T;
(function(t) {
  t.STRING = "string", t.NUMBER = "number", t.INTEGER = "integer", t.BOOLEAN = "boolean", t.ARRAY = "array", t.OBJECT = "object";
})(T || (T = {}));
var m;
(function(t) {
  t.LANGUAGE_UNSPECIFIED = "language_unspecified", t.PYTHON = "python";
})(m || (m = {}));
var w;
(function(t) {
  t.OUTCOME_UNSPECIFIED = "outcome_unspecified", t.OUTCOME_OK = "outcome_ok", t.OUTCOME_FAILED = "outcome_failed", t.OUTCOME_DEADLINE_EXCEEDED = "outcome_deadline_exceeded";
})(w || (w = {}));
const b = ["user", "model", "function", "system"];
var M;
(function(t) {
  t.HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED", t.HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH", t.HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT", t.HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT", t.HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT", t.HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY";
})(M || (M = {}));
var L;
(function(t) {
  t.HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED", t.BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE", t.BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE", t.BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH", t.BLOCK_NONE = "BLOCK_NONE";
})(L || (L = {}));
var D;
(function(t) {
  t.HARM_PROBABILITY_UNSPECIFIED = "HARM_PROBABILITY_UNSPECIFIED", t.NEGLIGIBLE = "NEGLIGIBLE", t.LOW = "LOW", t.MEDIUM = "MEDIUM", t.HIGH = "HIGH";
})(D || (D = {}));
var G;
(function(t) {
  t.BLOCKED_REASON_UNSPECIFIED = "BLOCKED_REASON_UNSPECIFIED", t.SAFETY = "SAFETY", t.OTHER = "OTHER";
})(G || (G = {}));
var R;
(function(t) {
  t.FINISH_REASON_UNSPECIFIED = "FINISH_REASON_UNSPECIFIED", t.STOP = "STOP", t.MAX_TOKENS = "MAX_TOKENS", t.SAFETY = "SAFETY", t.RECITATION = "RECITATION", t.LANGUAGE = "LANGUAGE", t.BLOCKLIST = "BLOCKLIST", t.PROHIBITED_CONTENT = "PROHIBITED_CONTENT", t.SPII = "SPII", t.MALFORMED_FUNCTION_CALL = "MALFORMED_FUNCTION_CALL", t.OTHER = "OTHER";
})(R || (R = {}));
var x;
(function(t) {
  t.TASK_TYPE_UNSPECIFIED = "TASK_TYPE_UNSPECIFIED", t.RETRIEVAL_QUERY = "RETRIEVAL_QUERY", t.RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT", t.SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY", t.CLASSIFICATION = "CLASSIFICATION", t.CLUSTERING = "CLUSTERING";
})(x || (x = {}));
var U;
(function(t) {
  t.MODE_UNSPECIFIED = "MODE_UNSPECIFIED", t.AUTO = "AUTO", t.ANY = "ANY", t.NONE = "NONE";
})(U || (U = {}));
var H;
(function(t) {
  t.MODE_UNSPECIFIED = "MODE_UNSPECIFIED", t.MODE_DYNAMIC = "MODE_DYNAMIC";
})(H || (H = {}));
class u extends Error {
  constructor(e) {
    super(`[GoogleGenerativeAI Error]: ${e}`);
  }
}
class I extends u {
  constructor(e, n) {
    super(e), this.response = n;
  }
}
class q extends u {
  constructor(e, n, s, o) {
    super(e), this.status = n, this.statusText = s, this.errorDetails = o;
  }
}
class E extends u {
}
class P extends u {
}
const X = "https://generativelanguage.googleapis.com", Q = "v1beta", z = "0.24.1", Z = "genai-js";
var C;
(function(t) {
  t.GENERATE_CONTENT = "generateContent", t.STREAM_GENERATE_CONTENT = "streamGenerateContent", t.COUNT_TOKENS = "countTokens", t.EMBED_CONTENT = "embedContent", t.BATCH_EMBED_CONTENTS = "batchEmbedContents";
})(C || (C = {}));
class tt {
  constructor(e, n, s, o, i) {
    this.model = e, this.task = n, this.apiKey = s, this.stream = o, this.requestOptions = i;
  }
  toString() {
    var e, n;
    const s = ((e = this.requestOptions) === null || e === void 0 ? void 0 : e.apiVersion) || Q;
    let i = `${((n = this.requestOptions) === null || n === void 0 ? void 0 : n.baseUrl) || X}/${s}/${this.model}:${this.task}`;
    return this.stream && (i += "?alt=sse"), i;
  }
}
function et(t) {
  const e = [];
  return t?.apiClient && e.push(t.apiClient), e.push(`${Z}/${z}`), e.join(" ");
}
async function nt(t) {
  var e;
  const n = new Headers();
  n.append("Content-Type", "application/json"), n.append("x-goog-api-client", et(t.requestOptions)), n.append("x-goog-api-key", t.apiKey);
  let s = (e = t.requestOptions) === null || e === void 0 ? void 0 : e.customHeaders;
  if (s) {
    if (!(s instanceof Headers))
      try {
        s = new Headers(s);
      } catch (o) {
        throw new E(`unable to convert customHeaders value ${JSON.stringify(s)} to Headers: ${o.message}`);
      }
    for (const [o, i] of s.entries()) {
      if (o === "x-goog-api-key")
        throw new E(`Cannot set reserved header name ${o}`);
      if (o === "x-goog-api-client")
        throw new E(`Header name ${o} can only be set using the apiClient field`);
      n.append(o, i);
    }
  }
  return n;
}
async function st(t, e, n, s, o, i) {
  const a = new tt(t, e, n, s, i);
  return {
    url: a.toString(),
    fetchOptions: Object.assign(Object.assign({}, rt(i)), { method: "POST", headers: await nt(a), body: o })
  };
}
async function y(t, e, n, s, o, i = {}, a = fetch) {
  const { url: r, fetchOptions: d } = await st(t, e, n, s, o, i);
  return ot(r, d, a);
}
async function ot(t, e, n = fetch) {
  let s;
  try {
    s = await n(t, e);
  } catch (o) {
    it(o, t);
  }
  return s.ok || await at(s, t), s;
}
function it(t, e) {
  let n = t;
  throw n.name === "AbortError" ? (n = new P(`Request aborted when fetching ${e.toString()}: ${t.message}`), n.stack = t.stack) : t instanceof q || t instanceof E || (n = new u(`Error fetching from ${e.toString()}: ${t.message}`), n.stack = t.stack), n;
}
async function at(t, e) {
  let n = "", s;
  try {
    const o = await t.json();
    n = o.error.message, o.error.details && (n += ` ${JSON.stringify(o.error.details)}`, s = o.error.details);
  } catch {
  }
  throw new q(`Error fetching from ${e.toString()}: [${t.status} ${t.statusText}] ${n}`, t.status, t.statusText, s);
}
function rt(t) {
  const e = {};
  if (t?.signal !== void 0 || t?.timeout >= 0) {
    const n = new AbortController();
    t?.timeout >= 0 && setTimeout(() => n.abort(), t.timeout), t?.signal && t.signal.addEventListener("abort", () => {
      n.abort();
    }), e.signal = n.signal;
  }
  return e;
}
function N(t) {
  return t.text = () => {
    if (t.candidates && t.candidates.length > 0) {
      if (t.candidates.length > 1 && console.warn(`This response had ${t.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`), S(t.candidates[0]))
        throw new I(`${g(t)}`, t);
      return ct(t);
    } else if (t.promptFeedback)
      throw new I(`Text not available. ${g(t)}`, t);
    return "";
  }, t.functionCall = () => {
    if (t.candidates && t.candidates.length > 0) {
      if (t.candidates.length > 1 && console.warn(`This response had ${t.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`), S(t.candidates[0]))
        throw new I(`${g(t)}`, t);
      return console.warn("response.functionCall() is deprecated. Use response.functionCalls() instead."), F(t)[0];
    } else if (t.promptFeedback)
      throw new I(`Function call not available. ${g(t)}`, t);
  }, t.functionCalls = () => {
    if (t.candidates && t.candidates.length > 0) {
      if (t.candidates.length > 1 && console.warn(`This response had ${t.candidates.length} candidates. Returning function calls from the first candidate only. Access response.candidates directly to use the other candidates.`), S(t.candidates[0]))
        throw new I(`${g(t)}`, t);
      return F(t);
    } else if (t.promptFeedback)
      throw new I(`Function call not available. ${g(t)}`, t);
  }, t;
}
function ct(t) {
  var e, n, s, o;
  const i = [];
  if (!((n = (e = t.candidates) === null || e === void 0 ? void 0 : e[0].content) === null || n === void 0) && n.parts)
    for (const a of (o = (s = t.candidates) === null || s === void 0 ? void 0 : s[0].content) === null || o === void 0 ? void 0 : o.parts)
      a.text && i.push(a.text), a.executableCode && i.push("\n```" + a.executableCode.language + `
` + a.executableCode.code + "\n```\n"), a.codeExecutionResult && i.push("\n```\n" + a.codeExecutionResult.output + "\n```\n");
  return i.length > 0 ? i.join("") : "";
}
function F(t) {
  var e, n, s, o;
  const i = [];
  if (!((n = (e = t.candidates) === null || e === void 0 ? void 0 : e[0].content) === null || n === void 0) && n.parts)
    for (const a of (o = (s = t.candidates) === null || s === void 0 ? void 0 : s[0].content) === null || o === void 0 ? void 0 : o.parts)
      a.functionCall && i.push(a.functionCall);
  if (i.length > 0)
    return i;
}
const dt = [
  R.RECITATION,
  R.SAFETY,
  R.LANGUAGE
];
function S(t) {
  return !!t.finishReason && dt.includes(t.finishReason);
}
function g(t) {
  var e, n, s;
  let o = "";
  if ((!t.candidates || t.candidates.length === 0) && t.promptFeedback)
    o += "Response was blocked", !((e = t.promptFeedback) === null || e === void 0) && e.blockReason && (o += ` due to ${t.promptFeedback.blockReason}`), !((n = t.promptFeedback) === null || n === void 0) && n.blockReasonMessage && (o += `: ${t.promptFeedback.blockReasonMessage}`);
  else if (!((s = t.candidates) === null || s === void 0) && s[0]) {
    const i = t.candidates[0];
    S(i) && (o += `Candidate was blocked due to ${i.finishReason}`, i.finishMessage && (o += `: ${i.finishMessage}`));
  }
  return o;
}
function p(t) {
  return this instanceof p ? (this.v = t, this) : new p(t);
}
function lt(t, e, n) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var s = n.apply(t, e || []), o, i = [];
  return o = {}, a("next"), a("throw"), a("return"), o[Symbol.asyncIterator] = function() {
    return this;
  }, o;
  function a(l) {
    s[l] && (o[l] = function(c) {
      return new Promise(function(f, O) {
        i.push([l, c, f, O]) > 1 || r(l, c);
      });
    });
  }
  function r(l, c) {
    try {
      d(s[l](c));
    } catch (f) {
      v(i[0][3], f);
    }
  }
  function d(l) {
    l.value instanceof p ? Promise.resolve(l.value.v).then(h, _) : v(i[0][2], l);
  }
  function h(l) {
    r("next", l);
  }
  function _(l) {
    r("throw", l);
  }
  function v(l, c) {
    l(c), i.shift(), i.length && r(i[0][0], i[0][1]);
  }
}
const $ = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
function ut(t) {
  const e = t.body.pipeThrough(new TextDecoderStream("utf8", { fatal: !0 })), n = gt(e), [s, o] = n.tee();
  return {
    stream: ht(s),
    response: ft(o)
  };
}
async function ft(t) {
  const e = [], n = t.getReader();
  for (; ; ) {
    const { done: s, value: o } = await n.read();
    if (s)
      return N(Et(e));
    e.push(o);
  }
}
function ht(t) {
  return lt(this, arguments, function* () {
    const n = t.getReader();
    for (; ; ) {
      const { value: s, done: o } = yield p(n.read());
      if (o)
        break;
      yield yield p(N(s));
    }
  });
}
function gt(t) {
  const e = t.getReader();
  return new ReadableStream({
    start(s) {
      let o = "";
      return i();
      function i() {
        return e.read().then(({ value: a, done: r }) => {
          if (r) {
            if (o.trim()) {
              s.error(new u("Failed to parse stream"));
              return;
            }
            s.close();
            return;
          }
          o += a;
          let d = o.match($), h;
          for (; d; ) {
            try {
              h = JSON.parse(d[1]);
            } catch {
              s.error(new u(`Error parsing JSON response: "${d[1]}"`));
              return;
            }
            s.enqueue(h), o = o.substring(d[0].length), d = o.match($);
          }
          return i();
        }).catch((a) => {
          let r = a;
          throw r.stack = a.stack, r.name === "AbortError" ? r = new P("Request aborted when reading from the stream") : r = new u("Error reading from the stream"), r;
        });
      }
    }
  });
}
function Et(t) {
  const e = t[t.length - 1], n = {
    promptFeedback: e?.promptFeedback
  };
  for (const s of t) {
    if (s.candidates) {
      let o = 0;
      for (const i of s.candidates)
        if (n.candidates || (n.candidates = []), n.candidates[o] || (n.candidates[o] = {
          index: o
        }), n.candidates[o].citationMetadata = i.citationMetadata, n.candidates[o].groundingMetadata = i.groundingMetadata, n.candidates[o].finishReason = i.finishReason, n.candidates[o].finishMessage = i.finishMessage, n.candidates[o].safetyRatings = i.safetyRatings, i.content && i.content.parts) {
          n.candidates[o].content || (n.candidates[o].content = {
            role: i.content.role || "user",
            parts: []
          });
          const a = {};
          for (const r of i.content.parts)
            r.text && (a.text = r.text), r.functionCall && (a.functionCall = r.functionCall), r.executableCode && (a.executableCode = r.executableCode), r.codeExecutionResult && (a.codeExecutionResult = r.codeExecutionResult), Object.keys(a).length === 0 && (a.text = ""), n.candidates[o].content.parts.push(a);
        }
      o++;
    }
    s.usageMetadata && (n.usageMetadata = s.usageMetadata);
  }
  return n;
}
async function V(t, e, n, s) {
  const o = await y(
    e,
    C.STREAM_GENERATE_CONTENT,
    t,
    /* stream */
    !0,
    JSON.stringify(n),
    s
  );
  return ut(o);
}
async function J(t, e, n, s) {
  const i = await (await y(
    e,
    C.GENERATE_CONTENT,
    t,
    /* stream */
    !1,
    JSON.stringify(n),
    s
  )).json();
  return {
    response: N(i)
  };
}
function W(t) {
  if (t != null) {
    if (typeof t == "string")
      return { role: "system", parts: [{ text: t }] };
    if (t.text)
      return { role: "system", parts: [t] };
    if (t.parts)
      return t.role ? t : { role: "system", parts: t.parts };
  }
}
function A(t) {
  let e = [];
  if (typeof t == "string")
    e = [{ text: t }];
  else
    for (const n of t)
      typeof n == "string" ? e.push({ text: n }) : e.push(n);
  return Ct(e);
}
function Ct(t) {
  const e = { role: "user", parts: [] }, n = { role: "function", parts: [] };
  let s = !1, o = !1;
  for (const i of t)
    "functionResponse" in i ? (n.parts.push(i), o = !0) : (e.parts.push(i), s = !0);
  if (s && o)
    throw new u("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
  if (!s && !o)
    throw new u("No content is provided for sending chat message.");
  return s ? e : n;
}
function _t(t, e) {
  var n;
  let s = {
    model: e?.model,
    generationConfig: e?.generationConfig,
    safetySettings: e?.safetySettings,
    tools: e?.tools,
    toolConfig: e?.toolConfig,
    systemInstruction: e?.systemInstruction,
    cachedContent: (n = e?.cachedContent) === null || n === void 0 ? void 0 : n.name,
    contents: []
  };
  const o = t.generateContentRequest != null;
  if (t.contents) {
    if (o)
      throw new E("CountTokensRequest must have one of contents or generateContentRequest, not both.");
    s.contents = t.contents;
  } else if (o)
    s = Object.assign(Object.assign({}, s), t.generateContentRequest);
  else {
    const i = A(t);
    s.contents = [i];
  }
  return { generateContentRequest: s };
}
function j(t) {
  let e;
  return t.contents ? e = t : e = { contents: [A(t)] }, t.systemInstruction && (e.systemInstruction = W(t.systemInstruction)), e;
}
function vt(t) {
  return typeof t == "string" || Array.isArray(t) ? { content: A(t) } : t;
}
const K = [
  "text",
  "inlineData",
  "functionCall",
  "functionResponse",
  "executableCode",
  "codeExecutionResult"
], Ot = {
  user: ["text", "inlineData"],
  function: ["functionResponse"],
  model: ["text", "functionCall", "executableCode", "codeExecutionResult"],
  // System instructions shouldn't be in history anyway.
  system: ["text"]
};
function It(t) {
  let e = !1;
  for (const n of t) {
    const { role: s, parts: o } = n;
    if (!e && s !== "user")
      throw new u(`First content should be with role 'user', got ${s}`);
    if (!b.includes(s))
      throw new u(`Each item should include role field. Got ${s} but valid roles are: ${JSON.stringify(b)}`);
    if (!Array.isArray(o))
      throw new u("Content should have 'parts' property with an array of Parts");
    if (o.length === 0)
      throw new u("Each Content should have at least one part");
    const i = {
      text: 0,
      inlineData: 0,
      functionCall: 0,
      functionResponse: 0,
      fileData: 0,
      executableCode: 0,
      codeExecutionResult: 0
    };
    for (const r of o)
      for (const d of K)
        d in r && (i[d] += 1);
    const a = Ot[s];
    for (const r of K)
      if (!a.includes(r) && i[r] > 0)
        throw new u(`Content with role '${s}' can't contain '${r}' part`);
    e = !0;
  }
}
function Y(t) {
  var e;
  if (t.candidates === void 0 || t.candidates.length === 0)
    return !1;
  const n = (e = t.candidates[0]) === null || e === void 0 ? void 0 : e.content;
  if (n === void 0 || n.parts === void 0 || n.parts.length === 0)
    return !1;
  for (const s of n.parts)
    if (s === void 0 || Object.keys(s).length === 0 || s.text !== void 0 && s.text === "")
      return !1;
  return !0;
}
const B = "SILENT_ERROR";
class Rt {
  constructor(e, n, s, o = {}) {
    this.model = n, this.params = s, this._requestOptions = o, this._history = [], this._sendPromise = Promise.resolve(), this._apiKey = e, s?.history && (It(s.history), this._history = s.history);
  }
  /**
   * Gets the chat history so far. Blocked prompts are not added to history.
   * Blocked candidates are not added to history, nor are the prompts that
   * generated them.
   */
  async getHistory() {
    return await this._sendPromise, this._history;
  }
  /**
   * Sends a chat message and receives a non-streaming
   * {@link GenerateContentResult}.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async sendMessage(e, n = {}) {
    var s, o, i, a, r, d;
    await this._sendPromise;
    const h = A(e), _ = {
      safetySettings: (s = this.params) === null || s === void 0 ? void 0 : s.safetySettings,
      generationConfig: (o = this.params) === null || o === void 0 ? void 0 : o.generationConfig,
      tools: (i = this.params) === null || i === void 0 ? void 0 : i.tools,
      toolConfig: (a = this.params) === null || a === void 0 ? void 0 : a.toolConfig,
      systemInstruction: (r = this.params) === null || r === void 0 ? void 0 : r.systemInstruction,
      cachedContent: (d = this.params) === null || d === void 0 ? void 0 : d.cachedContent,
      contents: [...this._history, h]
    }, v = Object.assign(Object.assign({}, this._requestOptions), n);
    let l;
    return this._sendPromise = this._sendPromise.then(() => J(this._apiKey, this.model, _, v)).then((c) => {
      var f;
      if (Y(c.response)) {
        this._history.push(h);
        const O = Object.assign({
          parts: [],
          // Response seems to come back without a role set.
          role: "model"
        }, (f = c.response.candidates) === null || f === void 0 ? void 0 : f[0].content);
        this._history.push(O);
      } else {
        const O = g(c.response);
        O && console.warn(`sendMessage() was unsuccessful. ${O}. Inspect response object for details.`);
      }
      l = c;
    }).catch((c) => {
      throw this._sendPromise = Promise.resolve(), c;
    }), await this._sendPromise, l;
  }
  /**
   * Sends a chat message and receives the response as a
   * {@link GenerateContentStreamResult} containing an iterable stream
   * and a response promise.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async sendMessageStream(e, n = {}) {
    var s, o, i, a, r, d;
    await this._sendPromise;
    const h = A(e), _ = {
      safetySettings: (s = this.params) === null || s === void 0 ? void 0 : s.safetySettings,
      generationConfig: (o = this.params) === null || o === void 0 ? void 0 : o.generationConfig,
      tools: (i = this.params) === null || i === void 0 ? void 0 : i.tools,
      toolConfig: (a = this.params) === null || a === void 0 ? void 0 : a.toolConfig,
      systemInstruction: (r = this.params) === null || r === void 0 ? void 0 : r.systemInstruction,
      cachedContent: (d = this.params) === null || d === void 0 ? void 0 : d.cachedContent,
      contents: [...this._history, h]
    }, v = Object.assign(Object.assign({}, this._requestOptions), n), l = V(this._apiKey, this.model, _, v);
    return this._sendPromise = this._sendPromise.then(() => l).catch((c) => {
      throw new Error(B);
    }).then((c) => c.response).then((c) => {
      if (Y(c)) {
        this._history.push(h);
        const f = Object.assign({}, c.candidates[0].content);
        f.role || (f.role = "model"), this._history.push(f);
      } else {
        const f = g(c);
        f && console.warn(`sendMessageStream() was unsuccessful. ${f}. Inspect response object for details.`);
      }
    }).catch((c) => {
      c.message !== B && console.error(c);
    }), l;
  }
}
async function pt(t, e, n, s) {
  return (await y(e, C.COUNT_TOKENS, t, !1, JSON.stringify(n), s)).json();
}
async function At(t, e, n, s) {
  return (await y(e, C.EMBED_CONTENT, t, !1, JSON.stringify(n), s)).json();
}
async function yt(t, e, n, s) {
  const o = n.requests.map((a) => Object.assign(Object.assign({}, a), { model: e }));
  return (await y(e, C.BATCH_EMBED_CONTENTS, t, !1, JSON.stringify({ requests: o }), s)).json();
}
class k {
  constructor(e, n, s = {}) {
    this.apiKey = e, this._requestOptions = s, n.model.includes("/") ? this.model = n.model : this.model = `models/${n.model}`, this.generationConfig = n.generationConfig || {}, this.safetySettings = n.safetySettings || [], this.tools = n.tools, this.toolConfig = n.toolConfig, this.systemInstruction = W(n.systemInstruction), this.cachedContent = n.cachedContent;
  }
  /**
   * Makes a single non-streaming call to the model
   * and returns an object containing a single {@link GenerateContentResponse}.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async generateContent(e, n = {}) {
    var s;
    const o = j(e), i = Object.assign(Object.assign({}, this._requestOptions), n);
    return J(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (s = this.cachedContent) === null || s === void 0 ? void 0 : s.name }, o), i);
  }
  /**
   * Makes a single streaming call to the model and returns an object
   * containing an iterable stream that iterates over all chunks in the
   * streaming response as well as a promise that returns the final
   * aggregated response.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async generateContentStream(e, n = {}) {
    var s;
    const o = j(e), i = Object.assign(Object.assign({}, this._requestOptions), n);
    return V(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (s = this.cachedContent) === null || s === void 0 ? void 0 : s.name }, o), i);
  }
  /**
   * Gets a new {@link ChatSession} instance which can be used for
   * multi-turn chats.
   */
  startChat(e) {
    var n;
    return new Rt(this.apiKey, this.model, Object.assign({ generationConfig: this.generationConfig, safetySettings: this.safetySettings, tools: this.tools, toolConfig: this.toolConfig, systemInstruction: this.systemInstruction, cachedContent: (n = this.cachedContent) === null || n === void 0 ? void 0 : n.name }, e), this._requestOptions);
  }
  /**
   * Counts the tokens in the provided request.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async countTokens(e, n = {}) {
    const s = _t(e, {
      model: this.model,
      generationConfig: this.generationConfig,
      safetySettings: this.safetySettings,
      tools: this.tools,
      toolConfig: this.toolConfig,
      systemInstruction: this.systemInstruction,
      cachedContent: this.cachedContent
    }), o = Object.assign(Object.assign({}, this._requestOptions), n);
    return pt(this.apiKey, this.model, s, o);
  }
  /**
   * Embeds the provided content.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async embedContent(e, n = {}) {
    const s = vt(e), o = Object.assign(Object.assign({}, this._requestOptions), n);
    return At(this.apiKey, this.model, s, o);
  }
  /**
   * Embeds an array of {@link EmbedContentRequest}s.
   *
   * Fields set in the optional {@link SingleRequestOptions} parameter will
   * take precedence over the {@link RequestOptions} values provided to
   * {@link GoogleGenerativeAI.getGenerativeModel }.
   */
  async batchEmbedContents(e, n = {}) {
    const s = Object.assign(Object.assign({}, this._requestOptions), n);
    return yt(this.apiKey, this.model, e, s);
  }
}
class St {
  constructor(e) {
    this.apiKey = e;
  }
  /**
   * Gets a {@link GenerativeModel} instance for the provided model name.
   */
  getGenerativeModel(e, n) {
    if (!e.model)
      throw new u("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");
    return new k(this.apiKey, e, n);
  }
  /**
   * Creates a {@link GenerativeModel} instance from provided content cache.
   */
  getGenerativeModelFromCachedContent(e, n, s) {
    if (!e.name)
      throw new E("Cached content must contain a `name` field.");
    if (!e.model)
      throw new E("Cached content must contain a `model` field.");
    const o = ["model", "systemInstruction"];
    for (const a of o)
      if (n?.[a] && e[a] && n?.[a] !== e[a]) {
        if (a === "model") {
          const r = n.model.startsWith("models/") ? n.model.replace("models/", "") : n.model, d = e.model.startsWith("models/") ? e.model.replace("models/", "") : e.model;
          if (r === d)
            continue;
        }
        throw new E(`Different value for "${a}" specified in modelParams (${n[a]}) and cachedContent (${e[a]})`);
      }
    const i = Object.assign(Object.assign({}, n), { model: e.model, tools: e.tools, toolConfig: e.toolConfig, systemInstruction: e.systemInstruction, cachedContent: e });
    return new k(this.apiKey, i, s);
  }
}
export {
  G as BlockReason,
  Rt as ChatSession,
  H as DynamicRetrievalMode,
  m as ExecutableCodeLanguage,
  R as FinishReason,
  U as FunctionCallingMode,
  k as GenerativeModel,
  St as GoogleGenerativeAI,
  P as GoogleGenerativeAIAbortError,
  u as GoogleGenerativeAIError,
  q as GoogleGenerativeAIFetchError,
  E as GoogleGenerativeAIRequestInputError,
  I as GoogleGenerativeAIResponseError,
  L as HarmBlockThreshold,
  M as HarmCategory,
  D as HarmProbability,
  w as Outcome,
  b as POSSIBLE_ROLES,
  T as SchemaType,
  x as TaskType
};
