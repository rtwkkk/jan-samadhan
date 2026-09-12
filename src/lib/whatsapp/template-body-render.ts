
export function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, raw) => {
    const idx = Number(raw) - 1;
    return params[idx] ?? `\{\{${raw}\}\}`;
  });
}

export function templateBodyParams(
  templateParams?: string[] | null,
  templateMessageParams?: unknown
): string[] {
  const structured =
    templateMessageParams &&
    typeof templateMessageParams === 'object' &&
    Array.isArray((templateMessageParams as { body?: unknown }).body)
      ? ((templateMessageParams as { body: unknown[] }).body.filter(
          (v): v is string => typeof v === 'string'
        ) as string[])
      : null;

  if (structured && structured.length > 0) return structured;
  return Array.isArray(templateParams) ? templateParams : [];
}

export function templateContentText(
  row: { body_text: string } | null,
  params: string[],
  composerPreRendered?: string | null
): string | null {
  if (composerPreRendered) return composerPreRendered;
  if (!row) return null;
  return renderTemplateBody(row.body_text, params);
}
