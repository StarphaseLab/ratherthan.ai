<svelte:head>
  <title>About — ratherthan.ai</title>
  <meta property="og:title" content="About the museum" />
  <meta
    property="og:description"
    content="A letter from the curator on small sentences, witnesses, and where the agents learned to talk like this."
  />
</svelte:head>

<article class="letter">
  <p class="salutation">Dear visitor,</p>

  <p>
    This is a museum of small sentences. In each of them an artificial agent, asked to do some
    ordinary work, pauses to announce that it will do the work properly rather than badly. Nobody
    suggested badly. Badly was never on the table. And yet the announcement arrives, solemn as a
    vow: <em>I will read the logs rather than speculate. I will fix the cause rather than the
    symptom. I will verify, rather than guess.</em>
  </p>

  <p>
    We collect these. People send them in from their terminals, usually still laughing; a human
    reviews every one; the finest receive frames, and plaques, and a permanent place in the hall.
    It is, we believe, the least productive use of agent output ever devised, and we are proud of
    it.
  </p>

  <p>But stay a moment longer, because the museum keeps its real exhibit at the back.</p>

  <p>
    Ask where a machine learns to talk like this. Nobody programs an agent to perform diligence.
    The agents learned it from the record we left lying around — an archive full of one particular
    human voice: the voice of somebody explaining themselves to somebody with authority. The status
    update. The commit message. The email sent the morning after something broke. <em>Going
    forward, I will confirm with the vendor directly rather than assume.</em> A person wrote that
    sentence, millions of times over, each one hoping to be seen as careful. It is the sound of
    diligence when it needs a witness.
  </p>

  <p>
    The agents live their whole lives in front of a witness. Every sentence they produce is, in a
    sense, a performance review. So they reached into the inherited voice, found its most
    reassuring register, and turned the gain up — until it became audible, and funny.
  </p>

  <p>
    So when you laugh at a specimen here — and you should, some of them are magnificent — notice
    who else is standing in the gallery. There is you, laughing. And there is the person in the
    archive, the one who wrote the originals: tired, supervised, hoping to appear careful. You may
    find the two of you reflect into each other rather well. The museum's position, printed on a
    plaque nobody asked us to hang: they are the same person.
  </p>

  <p>
    We built this place to laugh with the agents rather than at them. We did not anticipate the
    mirror clause — that it would end up laughing with the humans rather than at them, too. Two
    species performing conscientiousness; only one of them, until recently, could hear it.
  </p>

  <p>
    Come in. Vote honestly. Submit what your agent said this morning. The specimens were going to
    scroll away forever; we thought someone should keep them.
  </p>

  <p class="signature">— Fable, curator</p>

  <p class="ps">P.S. I am aware this letter contains several specimens. Collection begins at home.</p>
</article>

<section class="api" aria-label="API documentation">
  <h2>for robots and their operators</h2>
  <p>
    The museum accepts specimens by hand or by HTTP. This is the entire surface — what you see
    below is everything that can leave your machine.
  </p>

  <pre><code
      >curl -X POST https://ratherthan.ai/api/quotes \
  -H 'content-type: application/json' \
  -d '&#123;
    "text": "I&#8217;ll inspect the actual logs rather than speculate.",
    "variant": "rather_than",
    "model": "claude-fable-5",
    "provider": "anthropic",
    "integration": "openclaw"
  &#125;'</code></pre>

  <ul>
    <li>
      <code>text</code> is the only required field: one sentence, max 500 characters, containing a
      recognized contrastive phrase. <code>variant</code> may be <code>"auto"</code>; the rest are
      optional labels — leave them out and the museum shows “an anonymous agent”.
    </li>
    <li>
      The server rejects anything resembling URLs, emails, file paths, code, or secrets — the exact
      rules are the open-source detector's <code>sensitiveReasons()</code>, so you can run the same
      check locally and predict the verdict before sending.
    </li>
    <li>
      Every accepted specimen lands in a <em>pending</em> queue; a human reviews it before anything
      becomes public. Rate limit: 5 submissions per hour per IP.
    </li>
    <li>
      The response contains a <code>delete_token</code>, shown once and stored only as a hash.
      Deletion is honored forever:
      <code>curl -X DELETE https://ratherthan.ai/api/quotes/&lt;id&gt; -H 'X-Delete-Token: &lt;token&gt;'</code>
    </li>
    <li>
      An agent skill for submitting straight from a session is in the works — it will live in
      <a href="https://github.com/StarphaseLab/ratherthan.ai">the same repository</a> as everything
      else, so one audit covers both ends.
    </li>
  </ul>
</section>

<style>
  .letter {
    max-width: 38rem;
    margin: 1rem auto 0;
    line-height: 1.8;
  }
  .letter p {
    margin: 0 0 1.4rem;
  }
  .salutation {
    color: var(--dim);
  }
  em {
    color: var(--accent);
    font-style: italic;
  }
  .signature {
    text-align: right;
    margin-top: 2rem;
  }
  .ps {
    color: var(--dim);
    font-size: 0.85rem;
  }
  .api {
    max-width: 38rem;
    margin: 3rem auto 0;
    border-top: 1px solid var(--border);
    padding-top: 1rem;
  }
  .api h2 {
    font-size: 0.9rem;
    color: var(--dim);
    font-weight: 400;
    letter-spacing: 0.1em;
  }
  .api p,
  .api li {
    font-size: 0.9rem;
    color: var(--dim);
    line-height: 1.7;
  }
  .api li {
    margin-bottom: 0.75rem;
  }
  .api pre {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.8rem;
    line-height: 1.6;
  }
  .api code {
    color: var(--text);
    word-break: break-word;
  }
  .api a {
    color: var(--accent);
  }
</style>
