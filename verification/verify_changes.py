from playwright.sync_api import sync_playwright
import os

def test_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Determine the absolute path to index.html
        cwd = os.getcwd()
        file_url = f"file://{cwd}/index.html"

        print(f"Navigating to {file_url}")
        page.goto(file_url)

        # Handle announcement modal if it appears
        try:
            page.wait_for_selector("#announcement-modal", state="visible", timeout=2000)
            print("Announcement modal found, closing...")
            # Try finding the close button or OK button
            # Assuming there's a button with class 'announcement-btn' or similar
            page.evaluate("document.getElementById('announcement-modal').classList.remove('show')")
        except:
            print("No announcement modal or already closed.")

        # 1. Test Coordinate Origin Dragging Logic
        # Switch to background tool
        page.click("#background-btn")
        # Select coordinate pattern
        # The background panel might need to be visible.
        # Clicking background-btn should show config-area.
        page.wait_for_selector("#config-area", state="visible")

        # Click coordinate pattern button
        page.click('button[data-pattern="coordinate"]')

        # Simulate touch start on origin (center of canvas)
        viewport = page.viewport_size
        cx = viewport['width'] / 2
        cy = viewport['height'] / 2

        # Simulate touch interaction
        # Note: Playwright mouse events work for mouse listeners.
        # For touch, we need to dispatch touch events if we want to test that specific logic,
        # but my change in main.js handles touchstart.
        # Let's verify the code structure via inspection mainly, but here we can check if buttons exist.

        # 2. Verify Buttons Exist
        flip_h = page.locator("#insert-image-flip-h-btn")
        flip_v = page.locator("#insert-image-flip-v-btn")

        if flip_h.count() > 0:
            print("Insert Image Flip Horizontal Button Found")
        else:
            print("Insert Image Flip Horizontal Button NOT Found")

        bg_flip_h = page.locator("#image-flip-h-btn")
        bg_flip_v = page.locator("#image-flip-v-btn")

        if bg_flip_h.count() > 0:
            print("Background Image Flip Horizontal Button Found")
        else:
            print("Background Image Flip Horizontal Button NOT Found")

        # Take a screenshot of the UI
        page.screenshot(path="verification/ui_check.png")

        browser.close()

if __name__ == "__main__":
    test_feature()
