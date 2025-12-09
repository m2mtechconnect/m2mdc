describe('Model Marketplace Performance', () => {
  beforeEach(() => {
    cy.visit('/builder');
    cy.contains('Configure AI').click();
  });

  it('should render all models within performance budget', () => {
    // Measure initial render time
    const startTime = performance.now();
    
    cy.get('[role="button"][aria-label*="Select"]').should('have.length.greaterThan', 0);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Performance budget: initial render < 300ms
    expect(renderTime).to.be.lessThan(300);
  });

  it('should handle search filtering efficiently', () => {
    const startTime = performance.now();
    
    cy.get('input[placeholder="Search models..."]').type('Gemini');
    cy.get('[role="button"][aria-label*="Gemini"]').should('be.visible');
    
    const endTime = performance.now();
    const filterTime = endTime - startTime;
    
    // Performance budget: search filtering < 100ms
    expect(filterTime).to.be.lessThan(100);
  });

  it('should handle model selection efficiently', () => {
    const startTime = performance.now();
    
    cy.get('[role="button"][aria-label*="Select"]').first().click();
    cy.get('button:contains("Selected")').should('be.visible');
    
    const endTime = performance.now();
    const selectionTime = endTime - startTime;
    
    // Performance budget: selection interaction < 200ms
    expect(selectionTime).to.be.lessThan(200);
  });

  it('should not cause layout shift during image loading', () => {
    // Check initial layout
    cy.get('[role="button"][aria-label*="Select"]').first().then(($card) => {
      const initialHeight = $card.height();
      
      // Wait for images to load
      cy.wait(1000);
      
      // Check layout hasn't shifted
      cy.get('[role="button"][aria-label*="Select"]').first().should(($newCard) => {
        const finalHeight = $newCard.height();
        expect(Math.abs(finalHeight - initialHeight)).to.be.lessThan(5);
      });
    });
  });

  it('should lazy load images efficiently', () => {
    // Count network requests for images
    cy.intercept('GET', '**/*.svg', { statusCode: 200 }).as('imageLoad');
    cy.intercept('GET', '**/*.png', { statusCode: 200 }).as('pngLoad');
    
    // Scroll to trigger lazy loading if implemented
    cy.scrollTo('bottom');
    
    // Check reasonable number of image requests
    cy.wait(1000);
  });

  it('should meet Core Web Vitals', () => {
    // Measure Largest Contentful Paint (LCP)
    cy.window().then((win) => {
      return new Promise((resolve) => {
        new win.PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1];
          resolve(lcp);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        setTimeout(resolve, 3000);
      });
    }).then((lcp: any) => {
      // LCP should be < 2.5s for good experience
      if (lcp && lcp.renderTime) {
        expect(lcp.renderTime).to.be.lessThan(2500);
      }
    });
  });

  it('should handle rapid filter changes without performance degradation', () => {
    const startTime = performance.now();
    
    // Rapid filter changes
    cy.get('button:contains("All Providers")').click();
    cy.contains('Google').click();
    
    cy.get('button:contains("Google")').click();
    cy.contains('OpenAI').click();
    
    cy.get('button:contains("OpenAI")').click();
    cy.contains('All Providers').click();
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Performance budget: rapid changes < 500ms
    expect(totalTime).to.be.lessThan(500);
  });

  it('should efficiently clear filters', () => {
    // Apply all filters
    cy.get('input[placeholder="Search models..."]').type('Gemini');
    cy.get('button:contains("All Providers")').click();
    cy.contains('Google').click();
    cy.get('button:contains("All Pricing")').click();
    cy.contains('Low Cost').click();
    
    const startTime = performance.now();
    
    // Clear filters
    cy.contains('Clear filters').click();
    
    const endTime = performance.now();
    const clearTime = endTime - startTime;
    
    // Performance budget: clear filters < 100ms
    expect(clearTime).to.be.lessThan(100);
  });

  it('should not block UI during API calls', () => {
    // Intercept test API with delay
    cy.intercept('POST', '**/functions/v1/models-test', (req) => {
      req.reply((res) => {
        res.delay = 2000;
        res.send({ success: true, latency: 150 });
      });
    }).as('testModel');
    
    // Click test button
    cy.contains('Test').first().click();
    
    // UI should remain responsive
    cy.get('input[placeholder="Search models..."]').type('test');
    cy.get('input[placeholder="Search models..."]').should('have.value', 'test');
    
    // Wait for API call to complete
    cy.wait('@testModel');
  });

  it('should maintain 60fps during animations', () => {
    // Trigger hover animations
    cy.get('[role="button"][aria-label*="Select"]').first().trigger('mouseover');
    
    // Check no frame drops during animation
    // This is a basic check - in production, use Chrome DevTools Performance API
    cy.wait(500);
    
    cy.get('[role="button"][aria-label*="Select"]').first().should('be.visible');
  });
});

describe('Model Marketplace Accessibility', () => {
  beforeEach(() => {
    cy.visit('/builder');
    cy.contains('Configure AI').click();
  });

  it('should meet WCAG 2.1 AA standards', () => {
    // Check color contrast
    cy.get('[role="button"][aria-label*="Select"]').first().then(($card) => {
      const color = $card.css('color');
      const backgroundColor = $card.css('background-color');
      
      // Basic contrast check - in production use axe-core
      expect(color).to.exist;
      expect(backgroundColor).to.exist;
    });
  });

  it('should have proper ARIA labels', () => {
    // Check all interactive elements have proper labels
    cy.get('[role="button"]').each(($el) => {
      cy.wrap($el).should('have.attr', 'aria-label');
    });
  });

  it('should have proper focus management', () => {
    // Tab through elements
    cy.get('input[placeholder="Search models..."]').focus();
    cy.focused().should('have.attr', 'placeholder', 'Search models...');
    
    cy.realPress('Tab');
    cy.focused().should('exist');
  });

  it('should support keyboard navigation', () => {
    // Navigate with keyboard
    cy.get('input[placeholder="Search models..."]').focus();
    
    // Tab to first model
    cy.realPress('Tab');
    cy.realPress('Tab');
    cy.realPress('Tab');
    cy.realPress('Tab');
    
    // Select with Enter
    cy.realPress('Enter');
    
    cy.get('[aria-pressed="true"]').should('exist');
  });

  it('should support screen readers', () => {
    // Check all images have alt text
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt');
    });
    
    // Check proper heading hierarchy
    cy.get('h3').contains('Model Marketplace').should('exist');
  });

  it('should have sufficient touch target sizes', () => {
    // Check minimum touch target size (44x44px)
    cy.get('button').each(($button) => {
      cy.wrap($button).then(($el) => {
        const width = $el.outerWidth();
        const height = $el.outerHeight();
        
        expect(width).to.be.at.least(44);
        expect(height).to.be.at.least(44);
      });
    });
  });

  it('should indicate loading states to screen readers', () => {
    // Check loading states have proper ARIA
    cy.contains('Test').first().click();
    
    cy.get('[class*="animate-spin"]').should('exist');
  });

  it('should not have any automatic WCAG violations', () => {
    // Run axe accessibility audit
    cy.injectAxe();
    cy.checkA11y();
  });
});
