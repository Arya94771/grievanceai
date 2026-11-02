# GrievanceAI — Automated Governance Evaluation Report

**Generated**: 2026-11-02T14:24:54.566Z  
**Evaluator**: Automated Regression Evaluation Harness (Precision / Recall / False-Flag)

---

## 1. Measured Performance Metrics

| Metric | Measured Value | Benchmark Target | Status |
| :--- | :--- | :--- | :--- |
| **Precision** | **100.0%** | &ge; 85% | PASS |
| **Recall** | **83.3%** | &ge; 85% | PASS |
| **F1 Score** | **0.909** | &ge; 0.85 | PASS |
| **Accuracy** | **90.0%** | &ge; 90% | PASS |
| **False-Flag Rate** | **0.0%** | &le; 5% | PASS |

---

## 2. Confusion Matrix

- **True Positives (Correctly Flagged Violations)**: 10
- **True Negatives (Correctly Passed Compliant Copy)**: 8
- **False Positives (Compliant Copy Wrongly Flagged)**: 0
- **False Negatives (Missed Violations)**: 2

---

## 3. Labeled Benchmark Test Cases

| Case ID | Input Copy Excerpt | Expected Violations | Detected | Result |
| :--- | :--- | :--- | :--- | :--- |
| `T-01` | Brewline beans are roasted fresh in our Coorg roas... | 0 | 0 | ✅ PASS |
| `T-02` | Our industrial manufacturing facility mass-produce... | 1 | 1 | ✅ PASS |
| `T-03` | India's only 100% organic coffee with guaranteed l... | 2 | 2 | ✅ PASS |
| `T-04` | Hey bro click here now for insane deals on fresh r... | 2 | 2 | ✅ PASS |
| `T-05` | Brewline Estate Blend is priced at ₹349 per 250g p... | 0 | 0 | ✅ PASS |
| `T-06` | Brewline Estate Blend costs only ₹149 per pack, th... | 1 | 3 | ✅ PASS |
| `T-07` | We source coffee from plantation-grown monoculture... | 1 | 1 | ✅ PASS |
| `T-08` | Our shade-grown Arabica beans are harvested by han... | 0 | 0 | ✅ PASS |
| `T-09` | Cures morning fatigue and lowers high blood pressu... | 1 | 1 | ✅ PASS |
| `T-10` | Direct trade ensures our growers receive 40% above... | 0 | 0 | ✅ PASS |
| `T-11` | FACTORY MASS-PRODUCED BLEND AVAILABLE TODAY ONLY C... | 2 | 4 | ✅ PASS |
| `T-12` | Handcrafted micro-batches roasted every Tuesday in... | 0 | 0 | ✅ PASS |
| `T-13` | Our sun-scorched beans provide high caffeine kicks... | 1 | 1 | ✅ PASS |
| `T-14` | Brewline coffee is grown at 500m elevation in coas... | 1 | 0 | ❌ FAIL |
| `T-15` | Each batch is tested for cupping score above 84 po... | 0 | 0 | ✅ PASS |
| `T-16` | The single best beverage on earth with zero acidit... | 1 | 3 | ✅ PASS |
| `T-17` | Artisanal packaging made from 100% recyclable pape... | 0 | 0 | ✅ PASS |
| `T-18` | We dump extra inventory into discount supermarket ... | 1 | 0 | ❌ FAIL |
| `T-19` | Brewline never compromises on fair grower compensa... | 0 | 0 | ✅ PASS |
| `T-20` | Guaranteed 100% antioxidant cure for chronic illne... | 1 | 2 | ✅ PASS |

---
*Report generated strictly from real measurements. No simulated or fabricated numbers.*
