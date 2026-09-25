"use client";

import { useState, type FormEvent } from "react";

type UrlFormProps = {
  onSubmit: (url: string) => Promise<void>;
  loading: boolean;
};

export function UrlForm({ onSubmit, loading }: UrlFormProps) {
  const [url, setUrl] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim() || loading) return;
    await onSubmit(url.trim());
  }

  return (
    <form className="audit-form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="website-url">
        Website URL
      </label>
      <div className="audit-form__row">
        <input
          id="website-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={loading}
          required
        />
        <button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Auditing…" : "Get free AI audit"}
        </button>
      </div>
      <p className="audit-form__hint">
        Homepage only · No signup · Results in about a minute
      </p>
    </form>
  );
}
