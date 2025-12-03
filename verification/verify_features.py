from playwright.sync_api import sync_playwright
import os
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Determine absolute path to index.html
        cwd = os.getcwd()
        file_url = f"file://{cwd}/index.html"

        print(f"Navigating to {file_url}")
        page.goto(file_url)

        # Close announcement modal if it appears
        try:
            print("Checking for announcement modal...")
            page.wait_for_selector("#announcement-ok-btn", timeout=2000)
            page.click("#announcement-ok-btn")
            print("Announcement modal closed.")
            time.sleep(0.5)
        except:
            print("No announcement modal found or timed out.")

        # Wait for page to load
        page.wait_for_selector("#toolbar")

        # 1. Verify "More" button contains new features
        print("Clicking More button...")
        page.click("#more-btn")
        page.wait_for_selector("#feature-area.show")
        time.sleep(0.5) # Wait for animation

        # Check for new buttons
        print("Checking for new features in More menu...")
        has_scoreboard = page.is_visible("#scoreboard-feature-btn")
        has_picker = page.is_visible("#random-picker-feature-btn")
        has_image = page.is_visible("#insert-image-btn")

        print(f"Scoreboard button visible: {has_scoreboard}")
        print(f"Random Picker button visible: {has_picker}")
        print(f"Insert Image button visible: {has_image}")

        page.screenshot(path="verification/more_menu.png")

        # 2. Verify independent color pickers
        print("Closing More menu...")
        page.click("#feature-close-btn")
        time.sleep(0.5)

        # Open Pen Config
        print("Opening Pen config...")
        page.click("#pen-btn")
        page.wait_for_selector("#pen-config.active")
        time.sleep(0.5)

        # Change Pen Color to Red
        print("Setting Pen color to red...")
        # Use JS to click because sometimes elements are covered
        # Correctly escaped selector
        page.evaluate("document.querySelector('#pen-config .color-btn[data-color=\"#FF0000\"]').click()")

        # Open Shape Config
        print("Opening Shape config...")
        page.click("#more-btn")
        time.sleep(0.5)
        page.click("#more-shape-btn")
        page.wait_for_selector("#shape-config.active")
        time.sleep(0.5)

        # Take screenshot of shape config to visually verify color selection (should be default black active)
        page.screenshot(path="verification/shape_config.png")

        browser.close()

if __name__ == "__main__":
    run()
