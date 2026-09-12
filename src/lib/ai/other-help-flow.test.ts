import { describe, it, expect } from 'vitest';
import { handleOtherHelpFlow } from './other-help-flow';

describe('handleOtherHelpFlow', () => {
  it('returns the help menu when isInitialIntent is true', async () => {
    const result = await handleOtherHelpFlow('3', true);
    expect(result).toContain('Other Help mein aap inmein se koi option choose kar sakte hain:');
    expect(result).toContain('4. Complaint kaise register karein');
    expect(result).toContain('8. Human support');
  });

  it('handles help option 4 correctly', async () => {
    const result = await handleOtherHelpFlow('4', false);
    expect(result).toContain('Main menu se "1" choose karein');
    expect(result).toContain('Confirmation ke baad complaint register hogi aur Complaint ID milegi');
    expect(result).toContain('4 se 8 mein se option choose kar sakte hain');
  });

  it('handles help option 5 correctly', async () => {
    const result = await handleOtherHelpFlow('5', false);
    expect(result).toContain('Complaint ID complaint register hone ke baad milti hai');
    expect(result).toContain('Complaint status ke liye main menu mein "2" choose karein');
    expect(result).toContain('4 se 8 mein se');
  });

  it('handles help option 6 correctly', async () => {
    const result = await handleOtherHelpFlow('6', false);
    expect(result).toContain('System complaint ko successfully register karta hai');
    expect(result).toContain('Citizen baad mein main menu ke Option 2 se current status check kar sakta hai');
    expect(result).toContain('4 se 8 mein se');
  });

  it('handles help option 7 correctly', async () => {
    const result = await handleOtherHelpFlow('7', false);
    expect(result).toContain('Complaint registration ke liye ye information zaroori hai');
    expect(result).toContain('Ye optional evidence mandatory nahi hai');
    expect(result).toContain('4 se 8 mein se');
  });

  it('handles help option 8 correctly', async () => {
    const result = await handleOtherHelpFlow('8', false);
    expect(result).toContain('agar aapko human support ki zarurat hai');
    expect(result).toContain('4 se 8 mein se');
  });

  it('handles invalid input inside help menu gracefully', async () => {
    const result = await handleOtherHelpFlow('9', false);
    expect(result).toContain('Ji, kripya 4 se 8 mein se koi option choose karein');
  });
});
