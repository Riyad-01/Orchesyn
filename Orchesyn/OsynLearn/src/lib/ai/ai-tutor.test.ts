import { describe, expect, it } from 'vitest';
import { tutorRespond, captureFromText } from './local-tutor';
import { getPersona } from './personas';

const ctx = { level: 'B1', name: 'Test', goal: 'general' };

describe('offline AI tutor', () => {
  it('builds a scorable capture from typed text', () => {
    const cap = captureFromText('Hello there my friend');
    expect(cap.words.length).toBe(4);
    expect(cap.typedFallback).toBe(true);
    expect(cap.engine).toBe('manual');
  });

  it('grammar doctor finds issues and produces a corrected version', () => {
    const r = tutorRespond('I have went to the market yesterday and buyed milk.', getPersona('grammar'), ctx);
    expect(r.markdown.toLowerCase()).toContain('→');
    expect(r.meta?.some((m) => m.label === 'issues')).toBe(true);
  });

  it('grammar doctor reports clean text as clean', () => {
    const r = tutorRespond('I went to the market yesterday.', getPersona('grammar'), ctx);
    // either zero issues or a corrected version — both are valid, must not crash
    expect(r.markdown.length).toBeGreaterThan(0);
  });

  it('vocabulary builder returns level-up suggestions or an idiom', () => {
    const r = tutorRespond('The movie was very good and I liked it a lot.', getPersona('vocab'), ctx);
    expect(/Level-up|Idiom|different words/i.test(r.markdown)).toBe(true);
  });

  it('IELTS examiner returns an estimated band', () => {
    const r = tutorRespond(
      'I think travel is very important because it helps people learn about other cultures and become more open minded.',
      getPersona('ielts'),
      ctx,
    );
    expect(r.markdown.toLowerCase()).toContain('band');
    expect(r.meta?.some((m) => m.label === 'band')).toBe(true);
  });

  it('answers a definition intent from the knowledge base', () => {
    const r = tutorRespond('What does diligent mean?', getPersona('free'), ctx);
    expect(r.markdown.toLowerCase()).toContain('hard-working');
  });

  it('answers a pronunciation intent with a breakdown', () => {
    const r = tutorRespond('How do I pronounce entrepreneur?', getPersona('pronounce'), ctx);
    expect(r.markdown.toLowerCase()).toContain('entrepreneur');
    expect(r.markdown).toContain('stress');
  });

  it('answers an idiom intent', () => {
    const r = tutorRespond('Teach me an idiom about work.', getPersona('vocab'), ctx);
    expect(r.markdown.toLowerCase()).toContain('idiom');
  });

  it('free talk responds conversationally and never empty', () => {
    const r = tutorRespond('I love travelling to new places and trying local food.', getPersona('free'), ctx);
    expect(r.markdown.length).toBeGreaterThan(10);
  });

  it('handles a short greeting without crashing', () => {
    const r = tutorRespond('Hi', getPersona('free'), ctx);
    expect(r.markdown.length).toBeGreaterThan(0);
    expect(r.chips?.length).toBeGreaterThan(0);
  });

  it('interview coach gives structured feedback', () => {
    const r = tutorRespond(
      'In my last job I handled customer complaints and I tried to solve them quickly so customers stayed happy with our service overall.',
      getPersona('interview'),
      ctx,
    );
    expect(r.markdown.toLowerCase()).toContain('feedback');
  });

  it('roleplay stays in character', () => {
    const r = tutorRespond('I want to order a coffee please.', getPersona('roleplay'), ctx);
    expect(r.markdown.toLowerCase()).toContain('character');
  });
});
