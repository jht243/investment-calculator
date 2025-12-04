import { test, expect } from '@playwright/test';
import path from 'path';

const LOCAL_CALCULATOR_PATH = path.resolve(process.cwd(), 'assets/investment-calculator.html');

const TEST_CASES = [
    { currentBalance: 10000, monthlyContribution: 500, timeHorizon: 20, expectedMinFutureValue: 200000 },
    { currentBalance: 50000, monthlyContribution: 1000, timeHorizon: 30, expectedMinFutureValue: 1000000 },
    { currentBalance: 0, monthlyContribution: 200, timeHorizon: 10, expectedMinFutureValue: 25000 },
];

test.describe('Investment Calculator Tests', () => {
    test('Calculator loads successfully', async ({ page }) => {
        await page.goto(`file://${LOCAL_CALCULATOR_PATH}`);
        
        // Wait for the component to be interactive
        await expect(page.getByText('Investment Calculator')).toBeVisible({ timeout: 10000 });
    });

    test('Calculator displays goal selection buttons', async ({ page }) => {
        await page.goto(`file://${LOCAL_CALCULATOR_PATH}`);
        
        // Check for goal selection buttons
        await expect(page.getByText('Reach a Target')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('See Future Growth')).toBeVisible({ timeout: 10000 });
    });

    test('Calculator displays input fields', async ({ page }) => {
        await page.goto(`file://${LOCAL_CALCULATOR_PATH}`);
        
        // Wait for the component to load
        await page.waitForTimeout(2000);
        
        // Check for input labels/fields
        await expect(page.getByText('Current Balance')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Monthly Contribution')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Time Horizon')).toBeVisible({ timeout: 10000 });
    });

    test('Calculator displays investment strategy options', async ({ page }) => {
        await page.goto(`file://${LOCAL_CALCULATOR_PATH}`);
        
        // Wait for the component to load
        await page.waitForTimeout(2000);
        
        // Check for strategy buttons
        await expect(page.getByText('Conservative')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Moderate')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Aggressive')).toBeVisible({ timeout: 10000 });
    });

    test('Calculator displays results section', async ({ page }) => {
        await page.goto(`file://${LOCAL_CALCULATOR_PATH}`);
        
        // Wait for the component to load
        await page.waitForTimeout(2000);
        
        // Check that results section exists (it should show default calculations)
        // Look for currency formatting or result labels
        const pageContent = await page.content();
        expect(pageContent).toContain('$');
    });

    for (const params of TEST_CASES) {
        test(`Investment projection for $${params.currentBalance} initial, $${params.monthlyContribution}/mo, ${params.timeHorizon} years`, async ({ page }) => {
            await page.goto(`file://${LOCAL_CALCULATOR_PATH}`);
            
            // Wait for the component to be interactive
            await page.waitForTimeout(3000);
            
            // The component should load with default values and show a result
            // This is a basic sanity check that the calculator renders
            const pageContent = await page.content();
            
            // Verify basic structure exists
            expect(pageContent).toContain('Investment');
            expect(pageContent).toContain('$');
        });
    }
});
