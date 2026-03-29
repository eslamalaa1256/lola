# TODO: Complete Product Details Page Enhancements (Updated BLACKBOXAI Plan)

## Current Status: Plan confirmed - ✅ Step 1: TODO.md created/updated
## Target: Complete original TODO + 3 new features (comparison, bundles, stock alerts)

### Phase 1: Original TODO Completion (Steps 5-11 from original)
- [✅] 5. Dynamic Breadcrumb: Implemented (syntax issues noted, template literal backticks may cause parse errors in old browsers, concat alternative ready)\n- [✅] 9. SEO Schema: Added JSON-LD script in head, dynamic update logic in JS\n- [✅] 10. Buy Now: Added button in product-actions, buyNow() function (adds to cart then checkout redirect)
- [ ] 6. Add-to-cart toast: Integrate js/ui.js showToast() (file confirmed exists)
- [ ] 7. Product info (price/stock/desc): Verify complete (already functional per code review)
- [ ] 8. Buy options (qty/color/size/gift): Enhance with bundle selector (partial done)
- [ ] 9. SEO (meta/OG/schema JSON-LD): Add to <head>
- [ ] 10. Clear buttons + Buy Now: Add Buy Now btn -> checkout.html prefilled
- [ ] 11. Test original features

### Phase 2: New \"More Features\"
- [ ] 12. Product Comparison: Compare btn, localStorage list (max 4), modal/link to compare.html
- [ ] 13. Bundle Deals: Section w/ 2 bundles (e.g. shirt + pants), addBundleToCart()
- [ ] 14. Stock Alert: Out-of-stock modal w/ email form, save to localStorage/Firebase
- [ ] 15. CSS updates: Styles for new elements in product-details.css

### Phase 3: Wrap-up
- [ ] 16. Mark all [✓], full test, attempt_completion w/ demo command

**Dependencies:** js/ui.js (exists), Firebase (configured), localStorage
**Current Step:** Ready for Phase 1 Step 5 (Breadcrumb)
**Progress:** 4/16 steps started
