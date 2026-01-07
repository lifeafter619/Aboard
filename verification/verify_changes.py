from playwright.sync_api import sync_playwright, expect
import time
import base64

def generate_test_image():
    # Simple 100x100 red square with a blue line on left to distinguish flip
    # This is a minimal GIF header + data, but let's use a simpler solid color SVG converted to data URL for robustness,
    # or just a canvas generated data URL.
    # Actually, let's use a script in the page to generate a data URL.
    return None

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Load Page
        page.goto('http://localhost:3000')

        # Close announcement modal if it exists (try forcing js close if button click fails or element covered)
        page.evaluate("document.getElementById('announcement-modal').classList.remove('show')")

        # 2. Test Coordinate Origin Dragging
        # Ensure config panel is open for background
        page.click('#background-btn')
        # Switch to Coordinate background
        page.locator('button[data-pattern="coordinate"]').click()

        # Switch to background tool (simulating "Move Origin" button click which now just switches tool)
        page.click('#move-origin-btn')

        # Origin is at center.
        # Screen center = viewport/2.
        # Let's perform a drag.
        viewport = page.viewport_size
        center_x = viewport['width'] / 2
        center_y = viewport['height'] / 2

        # Drag from center to right
        page.mouse.move(center_x, center_y)
        page.mouse.down()
        page.mouse.move(center_x + 100, center_y)
        page.mouse.up()

        # Take screenshot of moved origin
        page.screenshot(path='verification/coordinate_moved.png')

        # 3. Test Background Image Upload and Flip
        # Trigger file upload logic manually since we can't easily upload file in headless without input element visibility sometimes.
        # But we can simulate the "change" event or just call backgroundManager directly.

        # Create a test image (red left, blue right)
        page.evaluate("""
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'red';
            ctx.fillRect(0,0,100,100);
            ctx.fillStyle = 'blue';
            ctx.fillRect(100,0,100,100);
            window.testImageData = canvas.toDataURL();

            // Trigger upload
            const bgManager = new BackgroundManager(document.getElementById('background-canvas'), document.getElementById('background-canvas').getContext('2d'));
            // We need to access the main instance attached to the window or create a new one?
            // The main.js doesn't expose 'drawingBoard' globally.
            // But we can trigger the listener if we find the input.
        """)

        # We can't easily access the existing instance.
        # However, the input listener is attached to #bg-image-upload.
        # We can set the input files programmatically?
        # Playwright has set_input_files.

        # Let's generate a real file.
        # Actually, simpler to just inject the image into the background manager if we could find it.
        # But since we can't, let's use file upload.

        # Create a dummy image file
        # We'll skip real file creation and try to mock the file input behavior or just inject via console if we can find a way.
        # Wait, the app is running. We can't access `drawingBoard` instance because it's not global.
        # But we can simulate the behavior by modifying the code temporarily or just trusting the UI interactions.

        # Let's try to find the hidden input.
        # The input is id="bg-image-upload".
        # We need a real file.

        # Alternative: The "Insert Image" and "Background" use similar logic.
        # But we specifically added Flip to ImageControls which is used by Background.

        # Let's try to mock the file upload using Playwright's buffer upload.
        page.evaluate("""
            const canvas = document.createElement('canvas');
            canvas.width = 3000; // Large image to test resizing (screen is likely smaller than 3000)
            canvas.height = 2000;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'red';
            ctx.fillRect(0,0,1500,2000);
            ctx.fillStyle = 'blue';
            ctx.fillRect(1500,0,1500,2000);

            canvas.toBlob((blob) => {
                const file = new File([blob], "test.png", {type: "image/png"});
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                document.getElementById('bg-image-upload').files = dataTransfer.files;
                document.getElementById('bg-image-upload').dispatchEvent(new Event('change'));
            });
        """)

        # Wait for controls to appear
        page.wait_for_selector('#image-controls-overlay', state='visible')
        time.sleep(1) # Wait for image to load/render

        # Screenshot original (Red Left, Blue Right)
        page.screenshot(path='verification/image_original.png')

        # Click Flip
        page.click('#image-flip-btn')
        time.sleep(0.5)

        # Screenshot flipped (Blue Left, Red Right)
        page.screenshot(path='verification/image_flipped.png')

        # Verify Size
        # Get control box size
        box_width = page.evaluate("document.getElementById('image-controls-box').getBoundingClientRect().width")
        viewport_width = page.viewport_size['width']

        print(f"Viewport Width: {viewport_width}")
        print(f"Image Width: {box_width}")

        if box_width <= viewport_width * 0.5 + 5: # Allow small margin
            print("SUCCESS: Image width is within 50% limit")
        else:
            print(f"FAILED: Image width {box_width} exceeds 50% of {viewport_width}")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
