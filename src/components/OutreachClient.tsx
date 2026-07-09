"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OutreachEmail = {
  id: string;
  toEmail: string | null;
  subject: string;
  body: string;
  status: string;
  sentAt: string | null;
};

type Contact = {
  id: string;
  company: string;
  domain: string | null;
  name: string | null;
  title: string | null;
  linkedinUrl: string | null;
  email: string | null;
  emailGuesses: string[];
  notes: string | null;
  outreachEmails: OutreachEmail[];
  links: { linkedinPeople: string; linkedinRecruiters: string; googleXray: string };
};

export default function OutreachClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  // add form
  const [company, setCompany] = useState("");
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  function load() {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }

  useEffect(load, []);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, domain, name, title })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not add contact");
      setCompany("");
      setDomain("");
      setName("");
      setTitle("");
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add contact");
    } finally {
      setAdding(false);
    }
  }

  async function removeContact(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/contacts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Outreach</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Find the recruiter or hiring manager behind a role, confirm their email, and send a short
            personal note from your own inbox. Small volume, real messages.
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          {showAdd ? "Close" : "+ Add contact"}
        </button>
      </div>

      <div className="card p-4 mt-6 mb-6 text-sm text-slate-600 leading-relaxed">
        <strong className="text-slate-800">How finding people works:</strong> add the company (and its
        website domain), and you get one-click LinkedIn and Google searches to identify the right
        person, plus likely email addresses generated from common company patterns. You confirm the
        address before anything sends. Nothing is scraped, and mail goes from your own account with a
        daily cap.
      </div>

      {showAdd && (
        <form onSubmit={addContact} className="card p-5 mb-6 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Company *</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} required maxLength={120} className="input" placeholder="Acme Inc" />
          </div>
          <div>
            <label className="label">Company website domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} maxLength={120} className="input" placeholder="acme.com" />
            <p className="hint">Used to generate likely email addresses</p>
          </div>
          <div>
            <label className="label">Person&apos;s name (if known)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="input" placeholder="Jane Smith" />
          </div>
          <div>
            <label className="label">Their title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="input" placeholder="Technical Recruiter" />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={adding} className="btn-primary">
              {adding ? "Adding..." : "Add contact"}
            </button>
          </div>
        </form>
      )}

      {loaded && contacts.length === 0 && !showAdd && (
        <div className="card p-10 text-center">
          <p className="font-medium mb-1">No contacts yet</p>
          <p className="text-sm text-slate-500 mb-4">
            Add a company you applied to and start finding the people behind the posting.
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            + Add contact
          </button>
        </div>
      )}

      <div className="space-y-3">
        {contacts.map((c) => (
          <ContactCard key={c.id} contact={c} onDelete={() => removeContact(c.id)} onChanged={load} />
        ))}
      </div>
    </div>
  );
}

function ContactCard({
  contact,
  onDelete,
  onChanged
}: {
  contact: Contact;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState(contact.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [openDraft, setOpenDraft] = useState<OutreachEmail | null>(
    contact.outreachEmails.find((e) => e.status === "draft") ?? null
  );
  const [subject, setSubject] = useState(openDraft?.subject ?? "");
  const [body, setBody] = useState(openDraft?.body ?? "");
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState("");

  const lastSent = contact.outreachEmails.find((e) => e.status === "sent");

  async function confirmEmail(value: string) {
    setSavingEmail(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contact.id, email: value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save email");
      setEmail(value);
      contact.email = value;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save email");
    } finally {
      setSavingEmail(false);
    }
  }

  async function draft() {
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not draft email");
      setOpenDraft(data);
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft email");
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    if (!openDraft) return;
    setSending(true);
    setError("");
    try {
      // Persist edits, then send.
      const saveRes = await fetch("/api/outreach", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: openDraft.id, subject, body, toEmail: contact.email ?? undefined })
      });
      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || "Could not save draft");
      }
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: openDraft.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setOpenDraft(null);
      setSentNotice(`Sent to ${data.toEmail}`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="font-semibold">
            {contact.name || "Unknown person"}{" "}
            <span className="font-normal text-slate-500">
              {contact.title ? `· ${contact.title} ` : ""}@ {contact.company}
            </span>
          </h3>
          {email ? (
            <p className="text-sm text-good mt-0.5">✓ {email}</p>
          ) : (
            <p className="text-sm text-slate-400 mt-0.5">No confirmed email yet</p>
          )}
          {lastSent && (
            <p className="text-xs text-slate-400 mt-0.5">
              Last sent {lastSent.sentAt ? new Date(lastSent.sentAt).toLocaleDateString() : ""}: &ldquo;{lastSent.subject}&rdquo;
            </p>
          )}
        </div>
        <button onClick={onDelete} className="text-slate-300 hover:text-red-500 text-sm" title="Delete contact">
          ✕
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <a href={contact.links.linkedinPeople} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-xs">
          LinkedIn: hiring managers ↗
        </a>
        <a href={contact.links.linkedinRecruiters} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-xs">
          LinkedIn: recruiters ↗
        </a>
        <a href={contact.links.googleXray} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-xs">
          Google x-ray search ↗
        </a>
        {contact.linkedinUrl && (
          <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-xs">
            Their profile ↗
          </a>
        )}
      </div>

      {contact.emailGuesses.length > 0 && !email && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-500 mb-1.5">
            Likely addresses (click to confirm the right one — verify with a tool like a free
            mailtester before sending):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {contact.emailGuesses.map((guess) => (
              <button
                key={guess}
                disabled={savingEmail}
                onClick={() => confirmEmail(guess)}
                className="chip bg-slate-100 text-slate-600 hover:bg-accent-soft hover:text-accent transition-colors"
              >
                {guess}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Or type their email directly"
          className="input !w-72"
        />
        <button
          onClick={() => confirmEmail(email)}
          disabled={savingEmail || !email}
          className="btn-secondary !py-1.5"
        >
          {savingEmail ? "Saving..." : "Confirm email"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {sentNotice && <p className="text-sm text-good mt-3">{sentNotice}</p>}

      <div className="mt-4 border-t border-slate-100 pt-4">
        {!openDraft ? (
          <button onClick={draft} disabled={drafting} className="btn-primary !py-1.5">
            {drafting ? "Writing draft..." : "Draft outreach email"}
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className="input" />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="input font-mono !text-xs" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={send} disabled={sending || !contact.email} className="btn-primary !py-1.5">
                {sending ? "Sending..." : `Send from my inbox`}
              </button>
              <button onClick={draft} disabled={drafting} className="btn-ghost !py-1.5">
                Regenerate
              </button>
              {!contact.email && (
                <span className="text-xs text-slate-400">Confirm an email address above to enable sending</span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Sends through the email account you configured in{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>
              , as you, counted against your daily outreach cap.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
