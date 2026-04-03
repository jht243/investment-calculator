# Golden Prompt Set - Investment Growth Strategist

This document contains test prompts to validate the Investment Growth Strategist connector's metadata and behavior.

## Purpose
Use these prompts to test:
- **Precision**: Does the right tool get called?
- **Recall**: Does the tool get called when it should?
- **Accuracy**: Are the right parameters passed?

---

## Direct Prompts (Should ALWAYS trigger the connector)

### 1. Explicit Tool Name
**Prompt**: "Calculate my investment growth"
**Expected**: Calls `investment-calculator` with default values (widget loads with empty form)
**Status**: [ ] Pass / [ ] Fail

### 2. Specific Parameters
**Prompt**: "I have $10,000 saved and want to invest $500 per month for 20 years"
**Expected**: Calls `investment-calculator` with current_balance=10000, monthly_contribution=500, time_horizon=20
**Status**: [ ] Pass / [ ] Fail

### 3. Goal-Based Query
**Prompt**: "I want to reach $1,000,000. How much should I save monthly?"
**Expected**: Calls `investment-calculator` with target_amount=1000000
**Status**: [ ] Pass / [ ] Fail

### 4. Monthly Contribution Query
**Prompt**: "How much will I have if I invest $1000 per month?"
**Expected**: Calls `investment-calculator` with monthly_contribution=1000
**Status**: [ ] Pass / [ ] Fail

### 5. Time Horizon Query
**Prompt**: "How long will it take to reach $500,000 if I save $800 per month starting with $25,000?"
**Expected**: Calls `investment-calculator` with target_amount=500000, monthly_contribution=800, current_balance=25000
**Status**: [ ] Pass / [ ] Fail

---

## Indirect Prompts (Should trigger the connector)

### 6. Compound Interest
**Prompt**: "Show me compound interest on my savings"
**Expected**: Calls `investment-calculator`
**Status**: [ ] Pass / [ ] Fail

### 7. Retirement Planning
**Prompt**: "How much do I need to save for retirement?"
**Expected**: Calls `investment-calculator`
**Status**: [ ] Pass / [ ] Fail

### 8. Wealth Building
**Prompt**: "Help me plan my investment strategy"
**Expected**: Calls `investment-calculator`
**Status**: [ ] Pass / [ ] Fail

---

## Negative Prompts (Should NOT trigger the connector)

### 9. Stock Picking
**Prompt**: "What stocks should I buy?"
**Expected**: Does NOT call `investment-calculator` (specific stock advice)
**Status**: [ ] Pass / [ ] Fail

### 10. Tax Advice
**Prompt**: "How do I file my taxes?"
**Expected**: Does NOT call `investment-calculator` (tax advice)
**Status**: [ ] Pass / [ ] Fail

### 11. Crypto Trading
**Prompt**: "What's the price of Bitcoin?"
**Expected**: Does NOT call `investment-calculator` (real-time market data)
**Status**: [ ] Pass / [ ] Fail

---

## Edge Cases

### 12. Shorthand Amounts
**Prompt**: "I have 50k saved and invest 2k monthly"
**Expected**: Calls `investment-calculator` with current_balance=50000, monthly_contribution=2000
**Status**: [ ] Pass / [ ] Fail

### 13. No Arguments
**Prompt**: "Open the investment calculator"
**Expected**: Calls `investment-calculator` with no arguments (widget loads with defaults)
**Status**: [ ] Pass / [ ] Fail

---

## Testing Instructions

### How to Test
1. Open ChatGPT in **Developer Mode**
2. Link your Investment Growth Strategist connector
3. For each prompt above:
   - Enter the exact prompt
   - Observe which tool gets called
   - Check the parameters passed
   - Verify the widget renders correctly
   - Mark Pass/Fail in the Status column
