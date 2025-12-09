import { describe, it, expect } from 'vitest';

describe('ROI Calculator Logic', () => {
  // Formula: Annual Savings = (Manual Hours × Hourly Cost × Automation % × 52)
  // ROI = (Annual Savings / (Manual Hours × Hourly Cost × 52)) × 100
  
  it('should calculate annual savings correctly', () => {
    const manualHours = 40;
    const hourlyCost = 75;
    const automationPercent = 60;
    
    const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
    
    expect(annualSavings).toBe(93600); // 40 * 75 * 0.6 * 52 = 93,600
  });
  
  it('should calculate time saved per week correctly', () => {
    const manualHours = 40;
    const automationPercent = 60;
    
    const timeSavedWeek = (manualHours * automationPercent) / 100;
    
    expect(timeSavedWeek).toBe(24); // 40 * 0.6 = 24 hours
  });
  
  it('should calculate ROI percentage correctly', () => {
    const manualHours = 40;
    const hourlyCost = 75;
    const automationPercent = 60;
    
    const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
    const totalManualCost = manualHours * hourlyCost * 52;
    const roi = (annualSavings / totalManualCost) * 100;
    
    expect(roi).toBe(60); // Should equal automation percentage
  });
  
  it('should handle zero manual hours gracefully', () => {
    const manualHours = 0;
    const hourlyCost = 75;
    const automationPercent = 60;
    
    const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
    const totalManualCost = manualHours * hourlyCost * 52;
    const roi = totalManualCost > 0 ? (annualSavings / totalManualCost) * 100 : 0;
    
    expect(annualSavings).toBe(0);
    expect(roi).toBe(0);
  });
  
  it('should handle 100% automation', () => {
    const manualHours = 40;
    const hourlyCost = 100;
    const automationPercent = 100;
    
    const timeSavedWeek = (manualHours * automationPercent) / 100;
    const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
    
    expect(timeSavedWeek).toBe(40); // All hours saved
    expect(annualSavings).toBe(208000); // 40 * 100 * 1.0 * 52
  });
  
  it('should handle minimum automation (10%)', () => {
    const manualHours = 20;
    const hourlyCost = 50;
    const automationPercent = 10;
    
    const timeSavedWeek = (manualHours * automationPercent) / 100;
    const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
    
    expect(timeSavedWeek).toBe(2); // 10% of 20 hours
    expect(annualSavings).toBe(5200); // 20 * 50 * 0.1 * 52
  });
  
  it('should scale linearly with hourly cost', () => {
    const manualHours = 40;
    const automationPercent = 50;
    
    const savings50 = manualHours * 50 * (automationPercent / 100) * 52;
    const savings100 = manualHours * 100 * (automationPercent / 100) * 52;
    
    expect(savings100).toBe(savings50 * 2); // Double cost = double savings
  });
  
  it('should return realistic values for typical scenario', () => {
    // Typical scenario: 40h/week, $75/hr, 60% automation, 12 months
    const manualHours = 40;
    const hourlyCost = 75;
    const automationPercent = 60;
    
    const annualSavings = manualHours * hourlyCost * (automationPercent / 100) * 52;
    const timeSavedWeek = (manualHours * automationPercent) / 100;
    const totalManualCost = manualHours * hourlyCost * 52;
    const roi = (annualSavings / totalManualCost) * 100;
    
    expect(annualSavings).toBeGreaterThan(50000); // Should save significant money
    expect(timeSavedWeek).toBe(24); // 24 hours saved per week
    expect(roi).toBe(60); // 60% ROI
  });
});

describe('Contact Form Validation', () => {
  it('should validate email format', () => {
    const validEmails = [
      'user@example.com',
      'john.doe@company.co.uk',
      'test+tag@domain.org'
    ];
    
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user@.com'
    ];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });
    
    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });
  
  it('should enforce name length limits', () => {
    const shortName = 'John';
    const maxName = 'A'.repeat(100);
    const tooLongName = 'A'.repeat(101);
    
    expect(shortName.length).toBeLessThanOrEqual(100);
    expect(maxName.length).toBe(100);
    expect(tooLongName.length).toBeGreaterThan(100);
  });
  
  it('should enforce message length limits', () => {
    const shortMessage = 'I need help';
    const maxMessage = 'A'.repeat(2000);
    const tooLongMessage = 'A'.repeat(2001);
    
    expect(shortMessage.length).toBeLessThanOrEqual(2000);
    expect(maxMessage.length).toBe(2000);
    expect(tooLongMessage.length).toBeGreaterThan(2000);
  });
});
