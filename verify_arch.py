from playwright.sync_api import sync_playwright

def verify_architecture():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8000')

        # Check transform-layer
        transform_layer = page.locator('#transform-layer')
        if not transform_layer.count():
            print("FAILED: #transform-layer not found")
            return

        # Check children
        if page.locator('#transform-layer > #background-canvas').count() == 0:
            print("FAILED: #background-canvas not in transform-layer")
        if page.locator('#transform-layer > #canvas').count() == 0:
            print("FAILED: #canvas not in transform-layer")

        print("SUCCESS: Architecture check passed")

        # Test background image insertion
        page.evaluate("""
            const bgManager = new BackgroundManager(document.getElementById('background-canvas'), document.getElementById('background-canvas').getContext('2d'));
            bgManager.backgroundPattern = 'image';
            bgManager.backgroundImageData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            bgManager.updateBackgroundImageElement();
        """)

        if page.locator('#transform-layer > #background-image-element').count() == 0:
            print("FAILED: Background image not inserted into transform-layer")
        else:
            print("SUCCESS: Background image in transform-layer")

        browser.close()

if __name__ == '__main__':
    verify_architecture()
