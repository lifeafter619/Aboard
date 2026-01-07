from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        cwd = os.getcwd()
        page.goto(f"file://{cwd}/index.html")

        # Close announcement modal first
        if page.is_visible("#announcement-modal"):
            page.click("#announcement-ok-btn")

        # Test 1: Verify Origin Drag Logic
        page.click("#settings-btn")
        # Ensure we wait for the modal to be visible
        page.wait_for_selector(".settings-modal-content", state="visible")

        # Click background tab
        page.click(".settings-tab-icon[data-tab=\"background\"]")

        # Wait for the panel content to switch
        page.wait_for_selector("#background-settings", state="visible")

        # Try to force visibility or JS click if CSS visibility is weird
        # The element seems to be detected but "not visible"
        # It is inside #background-settings which we just waited for.
        # Maybe it needs scrolling?

        # Force click via JS
        page.evaluate("document.querySelector(\".pattern-option-btn[data-pattern=coordinate]\").click()")

        page.click("#settings-close-btn")

        viewport_size = page.viewport_size
        center_x = viewport_size["width"] / 2
        center_y = viewport_size["height"] / 2

        page.click("#background-btn")

        # Verify drag
        # Drag from center
        page.mouse.move(center_x, center_y)
        page.mouse.down()
        page.mouse.move(center_x + 100, center_y)
        page.mouse.up()

        page.screenshot(path="verification/coordinate_drag.png")

        # Test 2: Random Picker Import UI
        page.click("#more-btn")
        # Wait for feature area
        page.wait_for_selector("#feature-area", state="visible")
        page.click("#random-picker-feature-btn")

        # Wait for random picker widget
        page.wait_for_selector(".random-picker-widget", state="visible")
        page.click(".random-picker-settings-btn")

        # Wait for settings modal
        page.wait_for_selector("#random-picker-settings-modal", state="visible")

        page.screenshot(path="verification/random_picker_import.png")

        browser.close()

if __name__ == "__main__":
    run()
