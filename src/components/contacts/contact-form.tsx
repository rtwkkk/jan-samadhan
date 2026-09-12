'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

import { toast } from 'sonner';
import type { Contact, Tag, ContactTag, CustomField } from '@/types';
import { normalizePhone, phonesMatch } from '@/lib/whatsapp/phone-utils';
import type { ExistingContact } from "@/lib/contacts/dedupe";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  contactTags?: ContactTag[];
  onSaved: () => void;
  /** Open an existing contact's detail view — used by the duplicate
   *  notice to jump to the contact that already owns this number. */
  onViewExisting?: (contactId: string) => void;
}

export function ContactForm({
  open,
  onOpenChange,
  contact,
  contactTags = [],
  onSaved,
  onViewExisting,
}: ContactFormProps) {
  const t = useTranslations('Contacts.form');
  const { accountId } = useAuth();
  const isEdit = !!contact;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  // Duplicate-phone detection for NEW contacts. `exact` (same digits)
  // hard-blocks the save; a fuzzy trunk-variant match only warns. The
  // DB unique index (migration 022) is the real backstop — this is the
  // friendly heads-up before we get there.
  const [dupMatch, setDupMatch] = useState<
    { contact: ExistingContact; exact: boolean } | null
  >(null);
  const [checkingDup, setCheckingDup] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [loadingCustom, setLoadingCustom] = useState(false);


  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '');
      setPhone(contact?.phone ?? '');
      setEmail(contact?.email ?? '');
      setCompany(contact?.company ?? '');
      setSelectedTagIds(contactTags.map((ct) => ct.tag_id));
      setDupMatch(null);
      fetchTags();
      fetchCustomFields();
    }
  }, [open, contact]);

  // Look up an existing contact with this number (new contacts only).
  // Runs on blur so we don't query on every keystroke.
  async function checkDuplicate() {
    if (isEdit || !accountId) return;
    const value = phone.trim();
    if (!value) {
      setDupMatch(null);
      return;
    }
    setCheckingDup(true);
    try {
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(value)}`);
      if (res.ok) {
        const data = await res.json();
        const matches = data.contacts || [];
        const match = matches.find((c: any) => phonesMatch(c.phone, value));
        if (match) {
          const isExact = normalizePhone(match.phone) === normalizePhone(value);
          setDupMatch({ contact: match, exact: isExact });
        } else {
          setDupMatch(null);
        }
      }
    } finally {
      setCheckingDup(false);
    }
  }

  
  async function fetchCustomFields() {
    setLoadingCustom(true);
    try {
      if (contact?.id) {
        const res = await fetch(`/api/contacts/${contact.id}/custom-values`);
        if (res.ok) {
          const data = await res.json();
          setCustomFields(data.fields || []);
          setCustomValues(data.values || {});
        }
      } else {
        const res = await fetch('/api/custom-fields');
        if (res.ok) {
          const data = await res.json();
          setCustomFields(data);
          setCustomValues({});
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustom(false);
    }
  }

  async function fetchTags() {
    setLoadingTags(true);
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (e) {}
    setLoadingTags(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error(t('phoneRequired'));
      return;
    }

    // Hard-block an exact duplicate on create (the DB unique index is
    // the real backstop; this avoids a round-trip + a raw error toast).
    if (!isEdit && dupMatch?.exact) {
      toast.error(t('toastConflict'));
      return;
    }

    setSaving(true);

    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!authRes.ok) return;
      const authData = await authRes.json();
      const user = authData.user ? { id: authData.user.id } : null;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      let contactId = contact?.id;

      if (isEdit && contactId) {
        const res = await fetch(`/api/v1/contacts/${contactId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            tags: selectedTagIds.map(id => tags.find(t => t.id === id)?.name).filter(Boolean),
          })
        });
        if (!res.ok) throw new Error('Failed to update contact');
        // Save custom fields for existing contact
        await fetch(`/api/contacts/${contactId}/custom-values`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: customValues }) });
      } else {
        const res = await fetch('/api/v1/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            tags: selectedTagIds.map(id => tags.find(t => t.id === id)?.name).filter(Boolean),
          })
        });
        if (!res.ok) throw new Error('Failed to create contact');
        const data = await res.json();
        const newContactId = data.data.id;
        // Save custom fields for new contact
        await fetch(`/api/contacts/${newContactId}/custom-values`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: customValues }) });
      }

      toast.success(isEdit ? t('toastSuccessEdit') : t('toastSuccessAdd'));
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('409')) {
        toast.error(t('toastConflict'));
        if (!isEdit) {
          // Re-trigger the blur check to fetch the existing record and show the conflict UI
          checkDuplicate();
        }
        return;
      }
      const message = err instanceof Error ? err.message : t('toastError');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {isEdit ? t('editTitle') : t('addTitle')}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? t('editDesc')
              : t('addDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-name" className="text-muted-foreground">
              {t('nameLabel')}
            </Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-phone" className="text-muted-foreground">
              {t('phoneLabel')} <span className="text-red-400">*</span>
            </Label>
            <Input
              id="cf-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (dupMatch) setDupMatch(null);
              }}
              onBlur={checkDuplicate}
              placeholder={t('phonePlaceholder')}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            {dupMatch ? (
              <div
                className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs ${
                  dupMatch.exact
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="space-y-1">
                  <p>
                    {dupMatch.exact
                      ? t('dupExact')
                      : t('dupSimilar')}
                  </p>
                  {onViewExisting && (
                    <button
                      type="button"
                      onClick={() => onViewExisting(dupMatch.contact.id)}
                      className="font-medium underline underline-offset-2 hover:no-underline"
                    >
                      {t('viewExisting', { name: dupMatch.contact.name || dupMatch.contact.phone })}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('phoneHint')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-email" className="text-muted-foreground">
              {t('emailLabel')}
            </Label>
            <Input
              id="cf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-company" className="text-muted-foreground">
              {t('companyLabel')}
            </Label>
            <Input
              id="cf-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t('companyPlaceholder')}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>


          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={`cf-${field.id}`} className="text-muted-foreground">
                {field.field_name}
              </Label>
              <Input
                id={`cf-${field.id}`}
                value={customValues[field.id] ?? ''}
                onChange={(e) => setCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                placeholder={t('enterCustomField', { name: field.field_name, defaultValue: `Enter ${field.field_name}...` })}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('tagsLabel')}</Label>
            {loadingTags ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-3 animate-spin" />
                {t('loadingTags')}
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('noTagsAvailable')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-border'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={saving || checkingDup || (!isEdit && !!dupMatch?.exact)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? t('update') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
