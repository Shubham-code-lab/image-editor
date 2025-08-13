document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const container = document.getElementById('container');
    const originalCanvas = document.getElementById('originalCanvas');
    const croppedCanvas = document.getElementById('croppedCanvas');
    const cropButton = document.getElementById('cropButton');
    const ctxOriginal = originalCanvas.getContext('2d');
    const ctxCropped = croppedCanvas.getContext('2d');
    
    let img = new Image();
    let cropBox = null;
    let isDragging = false;
    let isResizing = false;
    let resizeDirection = '';
    let startX, startY;
    
    // Fixed canvas dimensions and background color
    const canvasWidth = 400;
    const canvasHeight = 300;
    const backgroundColor = '#eeeeee'; // Light gray; change as needed
    
    // Variables for image scaling and positioning
    let scale = 1;
    let imgX = 0;
    let imgY = 0;
    let scaledWidth = 0;
    let scaledHeight = 0;
    
    // Create crop box element with handles (unchanged)
    function createCropBox(x, y, width, height) {
        const box = document.createElement('div');
        box.id = 'cropBox';
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        
        ['nw', 'ne', 'sw', 'se'].forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `handle ${dir}`;
            box.appendChild(handle);
        });
        
        ['n', 's', 'e', 'w'].forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `handle ${dir}`;
            box.appendChild(handle);
        });
        
        container.appendChild(box);
        return box;
    }
    
    // Image load and initial setup
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
                img.onload = () => {
                    // Set fixed canvas size
                    originalCanvas.width = canvasWidth;
                    originalCanvas.height = canvasHeight;
                    
                    // Calculate scale to fit image inside canvas (preserve aspect ratio)
                    scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
                    scaledWidth = img.width * scale;
                    scaledHeight = img.height * scale;
                    
                    // Center the image
                    imgX = (canvasWidth - scaledWidth) / 2;
                    imgY = (canvasHeight - scaledHeight) / 2;
                    
                    // Draw background fill
                    ctxOriginal.fillStyle = backgroundColor;
                    ctxOriginal.fillRect(0, 0, canvasWidth, canvasHeight);
                    
                    // Draw scaled image
                    ctxOriginal.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
                    
                    // Remove old crop box if exists
                    if (cropBox) container.removeChild(cropBox);
                    
                    // Create initial crop box centered on the image area
                    const initWidth = Math.min(100, scaledWidth);
                    const initHeight = Math.min(100, scaledHeight);
                    const initX = imgX + (scaledWidth - initWidth) / 2;
                    const initY = imgY + (scaledHeight - initHeight) / 2;
                    cropBox = createCropBox(initX, initY, initWidth, initHeight);
                    addEventListeners();
                };
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Add drag and resize listeners (unchanged)
    function addEventListeners() {
        cropBox.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        
        const handles = cropBox.querySelectorAll('.handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                isResizing = true;
                resizeDirection = handle.classList[1];
                startX = e.clientX;
                startY = e.clientY;
                e.stopPropagation();
            });
        });
    }
    
    function startDrag(e) {
        if (!isResizing) {
            isDragging = true;
            startX = e.clientX - cropBox.offsetLeft;
            startY = e.clientY - cropBox.offsetTop;
        }
    }
    
    function drag(e) {
        if (isDragging) {
            let newX = e.clientX - startX;
            let newY = e.clientY - startY;
            // Clamp to image bounds (not full canvas, to avoid background areas)
            newX = Math.max(imgX, Math.min(newX, imgX + scaledWidth - cropBox.offsetWidth));
            newY = Math.max(imgY, Math.min(newY, imgY + scaledHeight - cropBox.offsetHeight));
            cropBox.style.left = `${newX}px`;
            cropBox.style.top = `${newY}px`;
        } else if (isResizing) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            let left = parseFloat(cropBox.style.left);
            let top = parseFloat(cropBox.style.top);
            let width = parseFloat(cropBox.style.width);
            let height = parseFloat(cropBox.style.height);
            
            switch (resizeDirection) {
                case 'nw':
                    left += deltaX;
                    top += deltaY;
                    width -= deltaX;
                    height -= deltaY;
                    break;
                case 'ne':
                    top += deltaY;
                    width += deltaX;
                    height -= deltaY;
                    break;
                case 'sw':
                    left += deltaX;
                    width -= deltaX;
                    height += deltaY;
                    break;
                case 'se':
                    width += deltaX;
                    height += deltaY;
                    break;
                case 'n':
                    top += deltaY;
                    height -= deltaY;
                    break;
                case 's':
                    height += deltaY;
                    break;
                case 'e':
                    width += deltaX;
                    break;
                case 'w':
                    left += deltaX;
                    width -= deltaX;
                    break;
            }
            
            // Clamp position and size to stay within image bounds
            left = Math.max(imgX, Math.min(left, imgX + scaledWidth - width));
            top = Math.max(imgY, Math.min(top, imgY + scaledHeight - height));
            width = Math.max(10, Math.min(width, scaledWidth - (left - imgX) + 1)); // +1 for right side
            height = Math.max(10, Math.min(height, scaledHeight - (top - imgY) + 1)); // +1 for bottom side
            
            cropBox.style.left = `${left}px`;
            cropBox.style.top = `${top}px`;
            cropBox.style.width = `${width}px`;
            cropBox.style.height = `${height}px`;
            
            startX = e.clientX;
            startY = e.clientY;
        }
    }
    
    function endDrag() {
        isDragging = false;
        isResizing = false;
    }
    
    // Crop button logic with mapping to original image coordinates, fixed for 1px loss
    cropButton.addEventListener('click', () => {
        const x = parseFloat(cropBox.style.left) - imgX;
        const y = parseFloat(cropBox.style.top) - imgY;
        const width = parseFloat(cropBox.style.width);
        const height = parseFloat(cropBox.style.height);
        
        // Map back to original image scale with +1px for right/bottom
        const originalX = x / scale;
        const originalY = y / scale;
        const originalWidth = (width + 1) / scale;
        const originalHeight = (height + 1) / scale;
        
        croppedCanvas.width = width + 1;
        croppedCanvas.height = height + 1;
        ctxCropped.clearRect(0, 0, width + 1, height + 1);
        ctxCropped.drawImage(img, originalX, originalY, originalWidth, originalHeight, 0, 0, width + 1, height + 1);
    });
});
