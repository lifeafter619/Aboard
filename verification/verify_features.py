from playwright.sync_api import sync_playwright, expect
import time

def verify_features():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the page
        page.goto('http://localhost:8080')

        # Wait for page load
        time.sleep(2)

        # Check for announcement modal and close it if present
        announcement_ok = page.locator('#announcement-ok-btn')
        if announcement_ok.is_visible():
            announcement_ok.click()
            time.sleep(1)

        # Take initial screenshot
        page.screenshot(path='verification/initial.png')

        # Click "More" button by ID since language might be English
        more_btn = page.locator('#more-btn')
        more_btn.click()
        time.sleep(1)

        # Take screenshot of More menu
        page.screenshot(path='verification/more_menu.png')

        # Click "Random Picker" button
        picker_btn = page.locator('#random-picker-feature-btn')
        picker_btn.click()
        time.sleep(1)

        # Take screenshot of Random Picker
        page.screenshot(path='verification/random_picker.png')

        # Close Random Picker
        page.locator('#random-picker-close-btn').click()
        time.sleep(0.5)

        # Click "More" button again
        more_btn.click()
        time.sleep(0.5)

        # Click "Scoreboard" button
        scoreboard_btn = page.locator('#scoreboard-feature-btn')
        scoreboard_btn.click()
        time.sleep(1)

        # Take screenshot of Scoreboard
        page.screenshot(path='verification/scoreboard.png')

        browser.close()

if __name__ == '__main__':
    verify_features()
