/**
 * T-Shirt Editor JavaScript
 * Converted from Flutter implementation
 */

class TshirtEditor {
  constructor() {
    // State
    this.tshirtColor = 'black';
    this.size = 'L';
    this.quantity = 1;
    this.printSize = 'large';
    this.price = 45.0;
    this.type = 'standard-print';
    
    // Image properties
    this.userImage = null;
    this.tshirtImage = null;
    this.originalImageUrl = null; // R2 public URL of uploaded original design file
    this.imageX = 0;
    this.imageY = 0;
    this.imageScale = 1.0;
    this.imageRotation = 0.0;
    
    // Canvas
    this.canvas = document.getElementById('tshirtCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    
    // Editable area ratios (from Flutter constants)
    // These should match the Flutter implementation
    this.editableAreaWidthRatio = 0.4;  // 30% of canvas width (half-width from center)
    this.editableAreaHeightRatio = 0.7;  // 70% of canvas height (half-height from center)
    this.editableAreaVerticalOffsetRatio = 0.04; // 4% vertical offset
    
    // Interaction state
    this.isDragging = false; // Track if currently dragging
    this.isScaling = false;
    this.activeCorner = null;
    this.initialImageState = null;
    this.renderScheduled = false; // For requestAnimationFrame optimization
    this.isImageSelected = false; // Track if image is selected (for showing border)
    this.gestureState = {
      scale: 1.0,
      rotation: 0.0,
      initialScale: 1.0,
      initialRotation: 0.0
    };
    
    // Initialize
    this.init();
  }
  
  init() {
    // Load URL parameters (but don't update UI yet, wait for DOM to be ready)
    this.loadUrlParameters();
    
    // Load t-shirt image
    this.loadTshirtImage();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup canvas
    this.setupCanvas();
    
    // Initialize size display (ensure L button is active)
    this.setSize(this.size);
    
    // Update print size buttons after DOM is ready
    // This ensures buttons exist before we try to update their state
    if (this.printSize) {
      this.updatePrintSizeButtons();
    }
    
    // Update UI to reflect price and other state from URL parameters
    this.updateUI();
  }
  
  loadUrlParameters() {
    // First, try to get parameters from sessionStorage (POST-like behavior)
    let editorParams = null;
    try {
      const paramsStr = sessionStorage.getItem('editor_params');
      if (paramsStr) {
        editorParams = JSON.parse(paramsStr);
        console.log('Editor: Retrieved parameters from sessionStorage:', editorParams);
        // Clear the data after reading (one-time use)
        sessionStorage.removeItem('editor_params');
      }
    } catch (e) {
      console.error('Editor: Error reading parameters from sessionStorage:', e);
    }
    
    // Fallback to URL parameters if sessionStorage is not available
    const urlParams = new URLSearchParams(window.location.search);
    const priceParam = editorParams?.price || urlParams.get('price');
    const typeParam = editorParams?.type || urlParams.get('type');
    
    if (typeParam) {
      this.type = typeParam;
      
      switch (typeParam) {
        case 'small-logo':
          this.printSize = 'small';
          this.price = 28.0;
          break;
        case 'standard-print':
          this.printSize = 'standard';
          this.price = 35.0;
          break;
        case 'large-print':
          this.printSize = 'large';
          this.price = 45.0;
          break;
      }
    }
    
    // Price parameter overrides default price from type
    if (priceParam) {
      const price = parseFloat(priceParam);
      if (price > 0) {
        this.price = price;
      }
    }
    
    // Don't update UI here - wait for DOM to be ready in init()
    // updateUI() and updatePrintSizeButtons() will be called after setupEventListeners()
  }
  
  updatePrintSizeButtons() {
    // Update print size button active state
    document.querySelectorAll('.print-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === this.printSize);
    });
  }
  
  setupCanvas() {
    // Set initial canvas size
    const container = this.canvas.parentElement;
    const containerWidth = container.clientWidth;
    const aspectRatio = 1.0; // T-shirt aspect ratio
    
    this.canvasWidth = containerWidth;
    this.canvasHeight = containerWidth / aspectRatio;
    
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    
    // Handle resize
    window.addEventListener('resize', () => {
      const newWidth = container.clientWidth;
      const newHeight = newWidth / aspectRatio;
      
      const scaleX = newWidth / this.canvasWidth;
      const scaleY = newHeight / this.canvasHeight;
      
      // Scale image position
      if (this.userImage) {
        this.imageX = this.imageX * scaleX;
        this.imageY = this.imageY * scaleY;
      }
      
      this.canvasWidth = newWidth;
      this.canvasHeight = newHeight;
      this.canvas.width = this.canvasWidth;
      this.canvas.height = this.canvasHeight;
      
      this.render();
    });
    
    this.render();
  }
  
  async loadTshirtImage() {
    const tshirtImage = new Image();
    tshirtImage.crossOrigin = 'anonymous';
    // Use Shopify asset_url format from Liquid template
    // window.tshirtImageUrls is set by Liquid template using asset_url filter
    const tshirtFileName = `tee_${this.tshirtColor}.png`;
    
    // Try to get asset URL from window (set by Liquid template)
    if (window.tshirtImageUrls && window.tshirtImageUrls[this.tshirtColor]) {
      tshirtImage.src = window.tshirtImageUrls[this.tshirtColor];
    } else {
      // Fallback: try to use assetBaseUrl or construct path
      const assetBase = window.assetBaseUrl || '/assets/';
      tshirtImage.src = assetBase + tshirtFileName;
    }
    
    return new Promise((resolve, reject) => {
      tshirtImage.onload = () => {
        this.tshirtImage = tshirtImage;
        this.render();
        resolve();
      };
      tshirtImage.onerror = () => {
        console.error('Failed to load t-shirt image:', tshirtImage.src);
        reject(new Error(`Failed to load t-shirt image: ${tshirtImage.src}`));
      };
    });
  }
  
  setupEventListeners() {
    // File upload
    const uploadInput = document.getElementById('imageUpload');
    const uploadOverlay = document.getElementById('uploadOverlay');
    
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadUserImage(file);
      }
    });
    
    // Print size buttons
    document.querySelectorAll('.print-size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const size = e.target.dataset.size;
        this.setPrintSize(size);
      });
    });
    
    // Size buttons
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const size = e.target.dataset.size;
        this.setSize(size);
      });
    });
    
    // Color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.target.closest('.color-btn').dataset.color;
        this.setTshirtColor(color);
      });
    });
    
    // Quantity buttons
    document.getElementById('incrementBtn').addEventListener('click', () => {
      this.setQuantity(Math.min(this.quantity + 1, 100));
    });
    
    document.getElementById('decrementBtn').addEventListener('click', () => {
      this.setQuantity(Math.max(this.quantity - 1, 1));
    });
    
    // Quantity input validation
    const quantityInput = document.getElementById('quantityInput');
    quantityInput.addEventListener('input', (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value) || value < 1) {
        value = 1;
      } else if (value > 100) {
        value = 100;
      }
      // Update input value immediately if it was changed
      if (e.target.value !== value.toString()) {
        e.target.value = value;
      }
      this.setQuantity(value);
    });
    
    quantityInput.addEventListener('blur', (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value) || value < 1) {
        value = 1;
      } else if (value > 100) {
        value = 100;
      }
      e.target.value = value;
      this.setQuantity(value);
    });
    
    // Also prevent invalid input on keydown
    quantityInput.addEventListener('keydown', (e) => {
      // Allow: backspace, delete, tab, escape, enter, and decimal point
      if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
          // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          // Allow: home, end, left, right
          (e.keyCode >= 35 && e.keyCode <= 39)) {
        return;
      }
      // Ensure that it is a number and stop the keypress if it's not
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    });
    
    // Reset rotation button
    document.getElementById('resetRotationBtn').addEventListener('click', () => {
      this.imageRotation = 0;
      document.getElementById('resetRotationBtn').style.display = 'none';
      this.render();
    });
    
    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', () => {
      this.checkout();
    });
    
    // Upload image dialog close button
    const uploadImageDialogClose = document.getElementById('uploadImageDialogClose');
    if (uploadImageDialogClose) {
      uploadImageDialogClose.addEventListener('click', () => {
        this.hideUploadImageDialog();
      });
    }
    
    // Close dialog when clicking outside
    const uploadImageDialog = document.getElementById('uploadImageDialog');
    if (uploadImageDialog) {
      uploadImageDialog.addEventListener('click', (e) => {
        if (e.target === uploadImageDialog) {
          this.hideUploadImageDialog();
        }
      });
    }
    
    // Size chart modal
    const sizeChartBtn = document.getElementById('sizeChartBtn');
    const sizeChartModal = document.getElementById('sizeChartModal');
    const modalClose = sizeChartModal.querySelector('.modal-close');
    
    sizeChartBtn.addEventListener('click', () => {
      sizeChartModal.style.display = 'block';
    });
    
    modalClose.addEventListener('click', () => {
      sizeChartModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
      if (e.target === sizeChartModal) {
        sizeChartModal.style.display = 'none';
      }
    });
    
    // Canvas interactions
    this.setupCanvasInteractions();
    
    // Canvas click handler for showing/hiding image border
    this.setupCanvasClickHandler();
  }
  
  setupCanvasClickHandler() {
    // Handle clicks on canvas to show/hide image border
    this.canvas.addEventListener('click', (e) => {
      if (!this.userImage) return;
      
      // Prevent event if it's part of a drag operation
      if (this.isDragging || this.isScaling) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      // Check if click is on a corner handle - if so, don't change selection
      const corner = this.getCornerAtPoint(point);
      if (corner) {
        return; // Keep selection when clicking on corner
      }
      
      // Check if click is on image
      const isOnImage = this.isPointInImage(point);
      
      if (isOnImage) {
        // Click on image - show border
        this.isImageSelected = true;
      } else {
        // Click outside image - hide border
        this.isImageSelected = false;
      }
      
      // Re-render to update border visibility
      this.render();
    });
  }
  
  setupCanvasInteractions() {
    // Use interact.js for unified touch and mouse handling
    // Reference: https://interactjs.io/
    
    // Setup draggable for single finger/mouse drag
    interact(this.canvas)
      .draggable({
        enabled: () => this.userImage !== null && !this.isScaling,
        listeners: {
          start: (event) => {
            // Check if click is on image
            const rect = this.canvas.getBoundingClientRect();
            const point = {
              x: event.client.x - rect.left,
              y: event.client.y - rect.top
            };
            
            // Check if click is on a corner handle - if so, prevent drag
            const corner = this.getCornerAtPoint(point);
            if (corner) {
              // Corner handles are handled separately, prevent interact.js drag
              event.preventDefault();
              return;
            }
            
            // Check if started on image
            const isOnImage = this.isPointInImage(point);
            this.isImageSelected = isOnImage;
            if (isOnImage) {
              this.isDragging = true; // Mark as dragging
              this.initialImageState = {
                x: this.imageX,
                y: this.imageY
              };
            } else {
              // Not on image, prevent drag
              event.preventDefault();
            }
          },
          move: (event) => {
            if (!this.userImage || this.isScaling || !this.initialImageState) return;
            
            // Apply delta to current position
            const deltaX = event.dx;
            const deltaY = event.dy;
            
            let newX = this.initialImageState.x + deltaX;
            let newY = this.initialImageState.y + deltaY;
            
            // Constrain to editable area
            const constrained = this.constrainPosition(newX, newY);
            this.imageX = constrained.x;
            this.imageY = constrained.y;
            
            // Update initial state for next frame (for smooth dragging)
            this.initialImageState.x = this.imageX;
            this.initialImageState.y = this.imageY;
            
            // Render
            if (!this.renderScheduled) {
              this.renderScheduled = true;
              requestAnimationFrame(() => {
                this.render();
                this.renderScheduled = false;
              });
            }
          },
          end: (event) => {
            this.isDragging = false; // Reset dragging state
            this.initialImageState = null;
            // After drag ends, ensure image is still selected if it was being dragged
            if (this.userImage) {
              this.isImageSelected = true;
              this.render();
            }
          }
        }
      })
      .gesturable({
        enabled: () => this.userImage !== null,
        listeners: {
          start: (event) => {
            // Store initial gesture state
            this.gestureState.scale = this.imageScale;
            this.gestureState.rotation = this.imageRotation;
            this.gestureState.initialScale = event.scale;
            this.gestureState.initialRotation = event.angle;
          },
          move: (event) => {
            if (!this.userImage) return;
            
            // Calculate new scale from gesture scale
            // event.scale is cumulative from start of gesture (starts at 1.0)
            let newScale = this.gestureState.scale * event.scale;
            
            // Apply print size limit (large print now has limits too)
            const maxImageWidth = this.getMaxImageWidth(this.printSize);
            const maxImageHeight = this.getMaxImageHeight(this.printSize);
            
            const imageWidth = this.userImage.width;
            const imageHeight = this.userImage.height;
            
            // Calculate maximum scale based on print size limit
            const maxScaleX = maxImageWidth / imageWidth;
            const maxScaleY = maxImageHeight / imageHeight;
            const maxScale = Math.min(maxScaleX, maxScaleY);
            
            // Clamp scale: minimum and maximum based on print size limit
            // For small logo: max is 100x100, min is 30x30 (absolute limits, not relative to original)
            // Example: if original is 1000x1000, maxScale = 0.1 (100/1000), minScale = 0.03 (30/1000)
            // Example: if original is 100x100, maxScale = 1.0 (100/100), minScale = 0.3 (30/100)
            const minImageWidth = this.getMinImageWidth(this.printSize);
            const minImageHeight = this.getMinImageHeight(this.printSize);
            
            let minScale;
            if (minImageWidth !== null && minImageHeight !== null) {
              // For small logo: calculate minScale based on absolute 30x30 limit
              const minScaleX = minImageWidth / imageWidth;
              const minScaleY = minImageHeight / imageHeight;
              minScale = Math.max(minScaleX, minScaleY); // Use larger scale to ensure both dimensions are at least 30px
            } else {
              // For standard and large: allow very small scale to enable shrinking
              // Use a very small minimum (0.01 = 1%) to allow significant shrinking
              minScale = 0.01;
            }
            
            // Apply both min and max limits
            // For standard and large print, maxScale is the absolute limit - never exceed it
            // Ensure minScale is less than maxScale to allow scaling
            if (minScale >= maxScale) {
              // If minScale >= maxScale, the image is already at minimum size
              // For standard and large, strictly enforce maxScale (print size limit)
              if (this.printSize === 'standard' || this.printSize === 'large') {
                // Strictly enforce print size limit - never exceed maxScale
                newScale = Math.max(minScale, Math.min(newScale, maxScale));
              } else {
                // For small logo, allow slight flexibility
                const effectiveMaxScale = minScale * 1.1; // Allow 10% above minScale
                newScale = Math.max(minScale, Math.min(newScale, effectiveMaxScale));
              }
            } else {
              // Normal case: apply both min and max limits
              // For standard and large, maxScale is the absolute limit
              newScale = Math.max(minScale, Math.min(newScale, maxScale));
            }
            
            // Double-check: for standard and large, ensure we never exceed print size limit
            if (this.printSize === 'standard' || this.printSize === 'large') {
              const finalScaledWidth = imageWidth * newScale;
              const finalScaledHeight = imageHeight * newScale;
              if (finalScaledWidth > maxImageWidth || finalScaledHeight > maxImageHeight) {
                // If still exceeds, force to maxScale
                console.warn('⚠️ Scale would exceed print size limit, clamping to maxScale');
                newScale = maxScale;
              }
            }
            
            this.imageScale = newScale;
            
            // Calculate rotation
            // event.angle is in degrees, cumulative from start of gesture
            // Convert to radians and calculate delta
            const angleDeltaDeg = event.angle - this.gestureState.initialRotation;
            let angleDeltaRad = (angleDeltaDeg * Math.PI) / 180;
            // Normalize to [-π, π] range
            while (angleDeltaRad > Math.PI) angleDeltaRad -= 2 * Math.PI;
            while (angleDeltaRad < -Math.PI) angleDeltaRad += 2 * Math.PI;
            
            this.imageRotation = this.gestureState.rotation + angleDeltaRad;
            
            // Show reset rotation button if rotated
            document.getElementById('resetRotationBtn').style.display = 
              Math.abs(this.imageRotation) > 0.01 ? 'block' : 'none';
            
            // Render
            if (!this.renderScheduled) {
              this.renderScheduled = true;
              requestAnimationFrame(() => {
                this.render();
                this.renderScheduled = false;
              });
            }
          },
          end: (event) => {
            // Update gesture state for next gesture
            this.gestureState.scale = this.imageScale;
            this.gestureState.rotation = this.imageRotation;
          }
        }
      });
    
    // Handle corner resize separately (mouse/touch events for corner handles)
    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.userImage) return;
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      const corner = this.getCornerAtPoint(point);
      if (corner) {
        e.preventDefault();
        this.activeCorner = corner;
        this.initialImageState = {
          scale: this.imageScale,
          rotation: this.imageRotation,
          focalPoint: point
        };
        this.isScaling = true;
        this.isImageSelected = true;
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isScaling && this.activeCorner && this.initialImageState) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        this.handleCornerResize(point);
      }
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      if (this.isScaling) {
        this.isScaling = false;
        this.activeCorner = null;
        this.initialImageState = null;
      }
    });
    
    // Touch events for corner resize
    this.canvas.addEventListener('touchstart', (e) => {
      if (!this.userImage || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      const corner = this.getCornerAtPoint(point);
      if (corner) {
        e.preventDefault();
        this.activeCorner = corner;
        this.initialImageState = {
          scale: this.imageScale,
          rotation: this.imageRotation,
          focalPoint: point
        };
        this.isScaling = true;
        this.isImageSelected = true;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      if (this.isScaling && this.activeCorner && this.initialImageState && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const point = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
        this.handleCornerResize(point);
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      if (this.isScaling) {
        this.isScaling = false;
        this.activeCorner = null;
        this.initialImageState = null;
      }
    }, { passive: false });
  }
  
  getDistance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  getCornerAtPoint(point) {
    if (!this.userImage) return null;
    
    const imageHalfWidth = (this.userImage.width * this.imageScale) / 2;
    const imageHalfHeight = (this.userImage.height * this.imageScale) / 2;
    const handleSize = Math.max(12, Math.min(imageHalfWidth * 2, imageHalfHeight * 2) * 0.08);
    
    const center = { x: this.imageX, y: this.imageY };
    const corners = [
      { key: 'tl', x: -imageHalfWidth, y: -imageHalfHeight },
      { key: 'tr', x: imageHalfWidth, y: -imageHalfHeight },
      { key: 'bl', x: -imageHalfWidth, y: imageHalfHeight },
      { key: 'br', x: imageHalfWidth, y: imageHalfHeight }
    ];
    
    for (const corner of corners) {
      const cos = Math.cos(this.imageRotation);
      const sin = Math.sin(this.imageRotation);
      const rotatedX = corner.x * cos - corner.y * sin;
      const rotatedY = corner.x * sin + corner.y * cos;
      
      const worldX = center.x + rotatedX;
      const worldY = center.y + rotatedY;
      
      const distance = Math.sqrt(
        Math.pow(point.x - worldX, 2) + Math.pow(point.y - worldY, 2)
      );
      
      if (distance <= handleSize) {
        return corner.key;
      }
    }
    
    return null;
  }
  
  isPointInImage(point) {
    if (!this.userImage) return false;
    
    const imageHalfWidth = (this.userImage.width * this.imageScale) / 2;
    const imageHalfHeight = (this.userImage.height * this.imageScale) / 2;
    
    const center = { x: this.imageX, y: this.imageY };
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    
    const cos = Math.cos(-this.imageRotation);
    const sin = Math.sin(-this.imageRotation);
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    
    return Math.abs(rotatedX) <= imageHalfWidth && Math.abs(rotatedY) <= imageHalfHeight;
  }
  
  getMaxImageWidth(printSize) {
    // This matches Flutter's _getMaxImageWidth - used for limiting manual scaling
    switch (printSize) {
      case 'small':
        return 100.0;
      case 'standard':
        return 220.0;
      case 'large':
      default:
        // Large print: limit to 90% of editable area width
        if (this.canvasWidth > 0) {
          return this.canvasWidth * this.editableAreaWidthRatio * 0.9;
        }
        return 300.0; // Fallback value
    }
  }
  
  getMaxImageHeight(printSize) {
    // This matches Flutter's _getMaxImageHeight - used for limiting manual scaling
    switch (printSize) {
      case 'small':
        return 100.0;
      case 'standard':
        return 200.0;
      case 'large':
      default:
        // Large print: limit to 90% of editable area height
        if (this.canvasHeight > 0) {
          return this.canvasHeight * this.editableAreaHeightRatio * 0.9;
        }
        return 400.0; // Fallback value
    }
  }
  
  getMinImageWidth(printSize) {
    // For small logo: minimum is 30x30 (absolute, not relative to original)
    switch (printSize) {
      case 'small':
        return 30.0;
      case 'standard':
      case 'large':
      default:
        // For other sizes, use 0.1 as minimum scale (will be calculated relative to image)
        return null; // Indicates to use 0.1 scale factor
    }
  }
  
  getMinImageHeight(printSize) {
    // For small logo: minimum is 30x30 (absolute, not relative to original)
    switch (printSize) {
      case 'small':
        return 30.0;
      case 'standard':
      case 'large':
      default:
        // For other sizes, use 0.1 as minimum scale (will be calculated relative to image)
        return null; // Indicates to use 0.1 scale factor
    }
  }
  
  handleCornerResize(currentPoint) {
    // This matches Flutter's _handleCornerResize exactly (lines 104-155)
    if (!this.initialImageState || !this.userImage) return;
    
    const center = { x: this.imageX, y: this.imageY };
    
    // Calculate distance from center to initial and current points for scaling
    const initialDistance = this.getDistance(this.initialImageState.focalPoint, center);
    const currentDistance = this.getDistance(currentPoint, center);
    
    // Calculate scale factor based on distance change
    if (initialDistance > 0) {
      const scaleFactor = currentDistance / initialDistance;
      let newScale = this.initialImageState.scale * scaleFactor;
      
      // Apply scale limit based on print size
      const maxImageWidth = this.getMaxImageWidth(this.printSize);
      const maxImageHeight = this.getMaxImageHeight(this.printSize);
      
      // Always apply limits (large print now has limits too)
      const imageWidth = this.userImage.width;
      const imageHeight = this.userImage.height;
      
      // Calculate maximum scale based on print size limit
      const maxScaleX = maxImageWidth / imageWidth;
      const maxScaleY = maxImageHeight / imageHeight;
      const maxScale = Math.min(maxScaleX, maxScaleY);
      
      // Clamp scale: minimum and maximum based on print size limit
      // For small logo: max is 100x100, min is 30x30 (absolute limits, not relative to original)
      // Example: if original is 1000x1000, maxScale = 0.1 (100/1000), minScale = 0.03 (30/1000)
      // Example: if original is 100x100, maxScale = 1.0 (100/100), minScale = 0.3 (30/100)
      const minImageWidth = this.getMinImageWidth(this.printSize);
      const minImageHeight = this.getMinImageHeight(this.printSize);
      
      let minScale;
      if (minImageWidth !== null && minImageHeight !== null) {
        // For small logo: calculate minScale based on absolute 30x30 limit
        const minScaleX = minImageWidth / imageWidth;
        const minScaleY = minImageHeight / imageHeight;
        minScale = Math.max(minScaleX, minScaleY); // Use larger scale to ensure both dimensions are at least 30px
      } else {
        // For standard and large: allow very small scale to enable shrinking
        // Use a very small minimum (0.01 = 1%) to allow significant shrinking
        minScale = 0.01;
      }
      
      // Apply both min and max limits
      // For standard and large print, maxScale is the absolute limit - never exceed it
      // Ensure minScale is less than maxScale to allow scaling
      if (minScale >= maxScale) {
        // If minScale >= maxScale, the image is already at minimum size
        // For standard and large, strictly enforce maxScale (print size limit)
        if (this.printSize === 'standard' || this.printSize === 'large') {
          // Strictly enforce print size limit - never exceed maxScale
          this.imageScale = Math.max(minScale, Math.min(newScale, maxScale));
        } else {
          // For small logo, allow slight flexibility
          const effectiveMaxScale = minScale * 1.1; // Allow 10% above minScale
          this.imageScale = Math.max(minScale, Math.min(newScale, effectiveMaxScale));
        }
      } else {
        // Normal case: apply both min and max limits
        // For standard and large, maxScale is the absolute limit
        this.imageScale = Math.max(minScale, Math.min(newScale, maxScale));
      }
      
      // Double-check: for standard and large, ensure we never exceed print size limit
      if (this.printSize === 'standard' || this.printSize === 'large') {
        const finalScaledWidth = imageWidth * this.imageScale;
        const finalScaledHeight = imageHeight * this.imageScale;
        if (finalScaledWidth > maxImageWidth || finalScaledHeight > maxImageHeight) {
          // If still exceeds, force to maxScale
          console.warn('⚠️ Scale would exceed print size limit, clamping to maxScale');
          this.imageScale = maxScale;
        }
      }
    }
    
    // Calculate rotation based on angle change
    const initialVector = {
      dx: this.initialImageState.focalPoint.x - center.x,
      dy: this.initialImageState.focalPoint.y - center.y
    };
    const currentVector = {
      dx: currentPoint.x - center.x,
      dy: currentPoint.y - center.y
    };
    
    // Calculate angles using atan2
    const initialAngle = Math.atan2(initialVector.dy, initialVector.dx);
    const currentAngle = Math.atan2(currentVector.dy, currentVector.dx);
    
    // Calculate rotation delta
    let angleDelta = currentAngle - initialAngle;
    
    // Normalize angle to [-π, π] range
    while (angleDelta > Math.PI) angleDelta -= 2 * Math.PI;
    while (angleDelta < -Math.PI) angleDelta += 2 * Math.PI;
    
    // Apply rotation
    this.imageRotation = this.initialImageState.rotation + angleDelta;
    
        // Show reset rotation button if rotated
        document.getElementById('resetRotationBtn').style.display = 
          Math.abs(this.imageRotation) > 0.01 ? 'block' : 'none';
    
    // Use requestAnimationFrame for smoother rendering
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.render();
        this.renderScheduled = false;
      });
    }
  }
  
  constrainPosition(x, y) {
    // This matches Flutter's constraint logic exactly (lines 630-661)
    if (!this.userImage) return { x, y };
    
    // Editable area - always uses responsive size (same as large)
    const editableAreaWidth = this.canvasWidth * this.editableAreaWidthRatio / 2;
    const editableAreaHeight = this.canvasHeight * this.editableAreaHeightRatio / 2;
    const centerX = this.canvasWidth / 2 + 5; // Offset 20px to the right
    const centerY = this.canvasHeight / 2 + (this.canvasHeight * this.editableAreaVerticalOffsetRatio);
    
    // Boundary constraints within editable area
    // Ensure image content cannot move outside the editable area, considering rotation
    const imageWidth = this.userImage.width * this.imageScale * 0.5;
    const imageHeight = this.userImage.height * this.imageScale * 0.5;
    
    // Calculate bounding box size after rotation
    // When a rectangle is rotated, its bounding box size is:
    // width = |w * cos(θ)| + |h * sin(θ)|
    // height = |w * sin(θ)| + |h * cos(θ)|
    const absCos = Math.abs(Math.cos(this.imageRotation));
    const absSin = Math.abs(Math.sin(this.imageRotation));
    const rotatedWidth = imageWidth * absCos + imageHeight * absSin;
    const rotatedHeight = imageWidth * absSin + imageHeight * absCos;
    
    // Constrain image center so that rotated image edges stay within editable area
    // Image center can move within: [center - (areaSize - rotatedSize), center + (areaSize - rotatedSize)]
    const xMin = centerX - editableAreaWidth + rotatedWidth;
    const xMax = centerX + editableAreaWidth - rotatedWidth;
    const yMin = centerY - editableAreaHeight + rotatedHeight;
    const yMax = centerY + editableAreaHeight - rotatedHeight;
    
    // If rotated image is larger than editable area, center it and don't allow movement
    const constrainedX = (rotatedWidth >= editableAreaWidth)
        ? centerX  // Center if rotated image is too wide
        : Math.max(xMin, Math.min(xMax, x));
    const constrainedY = (rotatedHeight >= editableAreaHeight)
        ? centerY  // Center if rotated image is too tall
        : Math.max(yMin, Math.min(yMax, y));
    
    return { x: constrainedX, y: constrainedY };
  }
  
  async removeBackground(img) {
    // Remove background from image using canvas
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple background removal: remove white/light colors
      // Threshold for background removal (adjust as needed)
      const threshold = 240; // Pixels with RGB values above this will be made transparent
      const tolerance = 30; // Additional tolerance for near-white colors
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        
        // If pixel is close to white, make it transparent
        if (avg > threshold || (r > threshold - tolerance && g > threshold - tolerance && b > threshold - tolerance)) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }
      
      // Put modified image data back
      ctx.putImageData(imageData, 0, 0);
      
      // Create new image from processed canvas
      const processedImg = new Image();
      processedImg.onload = () => resolve(processedImg);
      processedImg.onerror = () => resolve(img); // Fallback to original if processing fails
      processedImg.src = canvas.toDataURL('image/png');
    });
  }
  
  async trimImage(img) {
    // Trim transparent/white edges from image
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const width = canvas.width;
      const height = canvas.height;
      
      // Find top edge
      let top = 0;
      for (let y = 0; y < height; y++) {
        let hasContent = false;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const alpha = pixels[i + 3];
          if (alpha > 0) {
            hasContent = true;
            break;
          }
        }
        if (hasContent) {
          top = y;
          break;
        }
      }
      
      // Find bottom edge
      let bottom = height - 1;
      for (let y = height - 1; y >= 0; y--) {
        let hasContent = false;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const alpha = pixels[i + 3];
          if (alpha > 0) {
            hasContent = true;
            break;
          }
        }
        if (hasContent) {
          bottom = y;
          break;
        }
      }
      
      // Find left edge
      let left = 0;
      for (let x = 0; x < width; x++) {
        let hasContent = false;
        for (let y = 0; y < height; y++) {
          const i = (y * width + x) * 4;
          const alpha = pixels[i + 3];
          if (alpha > 0) {
            hasContent = true;
            break;
          }
        }
        if (hasContent) {
          left = x;
          break;
        }
      }
      
      // Find right edge
      let right = width - 1;
      for (let x = width - 1; x >= 0; x--) {
        let hasContent = false;
        for (let y = 0; y < height; y++) {
          const i = (y * width + x) * 4;
          const alpha = pixels[i + 3];
          if (alpha > 0) {
            hasContent = true;
            break;
          }
        }
        if (hasContent) {
          right = x;
          break;
        }
      }
      
      // Calculate trimmed dimensions
      const trimmedWidth = right - left + 1;
      const trimmedHeight = bottom - top + 1;
      
      // If no content found or dimensions are invalid, return original
      if (trimmedWidth <= 0 || trimmedHeight <= 0 || left >= right || top >= bottom) {
        resolve(img);
        return;
      }
      
      // Create new canvas with trimmed dimensions
      const trimmedCanvas = document.createElement('canvas');
      trimmedCanvas.width = trimmedWidth;
      trimmedCanvas.height = trimmedHeight;
      const trimmedCtx = trimmedCanvas.getContext('2d');
      
      // Draw the trimmed portion
      trimmedCtx.drawImage(
        canvas,
        left, top, trimmedWidth, trimmedHeight,
        0, 0, trimmedWidth, trimmedHeight
      );
      
      const trimmedImg = new Image();
      trimmedImg.onload = () => resolve(trimmedImg);
      trimmedImg.onerror = () => resolve(img); // Fallback to original if processing fails
      trimmedImg.src = trimmedCanvas.toDataURL('image/png');
    });
  }
  
  /**
   * Upload file to R2 via Worker presigned URL. Returns public URL or null on failure.
   */
  async uploadOriginalToR2(file) {
    const baseUrl = typeof window.PRINTORA_WORKER_URL !== 'undefined' ? window.PRINTORA_WORKER_URL : '';
    if (!baseUrl) {
      console.warn('Editor: PRINTORA_WORKER_URL not set, skipping R2 upload');
      return null;
    }
    try {
      const res = await fetch(baseUrl + '/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name || 'image.png',
          contentType: file.type || 'image/png',
          prefix: 'originals'
        })
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Editor: Failed to get upload URL:', res.status, err);
        return null;
      }
      const { uploadUrl, publicUrl } = await res.json();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/png' }
      });
      if (!putRes.ok) {
        console.error('Editor: Failed to upload file to R2:', putRes.status);
        return null;
      }
      console.log('Editor: Original image uploaded to R2:', publicUrl);
      return publicUrl;
    } catch (e) {
      console.error('Editor: R2 upload error:', e);
      return null;
    }
  }

  async loadUserImage(file) {
    const publicUrl = await this.uploadOriginalToR2(file);
    this.originalImageUrl = publicUrl || null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          // Log original image size
          console.log('=== Image Upload Started ===');
          console.log('Original image size:', img.width, 'x', img.height);
          console.log('Original image file size:', file.size, 'bytes');
          
          // Remove background from image
          const bgRemovedImg = await this.removeBackground(img);
          console.log('After background removal:', bgRemovedImg.width, 'x', bgRemovedImg.height);
          
          // Trim transparent edges
          const processedImg = await this.trimImage(bgRemovedImg);
          console.log('After trimming (final processed image):', processedImg.width, 'x', processedImg.height);
          console.log('Processed image size change:', 
            ((processedImg.width / img.width) * 100).toFixed(2) + '% width,',
            ((processedImg.height / img.height) * 100).toFixed(2) + '% height');
          // Don't set userImage here - set it after calculating scale
          
          // Center image
          const centerX = this.canvasWidth / 2 + 5; // Offset 20px to the right
          const centerY = this.canvasHeight / 2 + (this.canvasHeight * this.editableAreaVerticalOffsetRatio);
          
          // Calculate initial scale (matches Flutter lines 399-425)
          const editableAreaWidth = this.canvasWidth * this.editableAreaWidthRatio;
          const editableAreaHeight = this.canvasHeight * this.editableAreaHeightRatio;
          
          // Calculate scale to fit image within editable area
          const imageWidth = processedImg.width;
          const imageHeight = processedImg.height;
          
          // Get print size limits first
          const maxImageWidth = this.getMaxImageWidth(this.printSize);
          const maxImageHeight = this.getMaxImageHeight(this.printSize);
          
          // Calculate scale based on print size limits (must fit within print size)
          // This ensures that if image is larger than print size, it will be scaled down
          const maxScaleX = maxImageWidth === Infinity ? Infinity : maxImageWidth / imageWidth;
          const maxScaleY = maxImageHeight === Infinity ? Infinity : maxImageHeight / imageHeight;
          const maxScale = Math.min(maxScaleX, maxScaleY);
          
          // For small and standard print sizes, use maxScale directly (strict limit)
          // For large print size, also consider editable area
          let finalScale;
          if (maxScale === Infinity) {
            // Large print: also calculate scale to fit within editable area
            const scaleX = editableAreaWidth / imageWidth;
            const scaleY = editableAreaHeight / imageHeight;
            const editableAreaScale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
            finalScale = editableAreaScale;
          } else {
            // Small or standard: STRICTLY use maxScale to ensure print size limit
            // Don't consider editable area - print size limit is absolute
            // This ensures images are always scaled down to fit within print size (100x100 for small, 220x200 for standard)
            finalScale = maxScale;
          }
          
          // Always set scale when image is uploaded, ensuring it fits within print size
          // For small/standard, finalScale is already the correct scale (maxScale)
          // For large, finalScale is editableAreaScale
          // IMPORTANT: Set scale BEFORE setting userImage to ensure render uses correct scale
          // Don't clamp to 3.0 for small/standard - they need to be smaller
          const calculatedScale = this.printSize === 'large' 
              ? Math.max(0.1, Math.min(finalScale, 3.0))
              : Math.max(0.01, finalScale); // Allow very small scales for small/standard to fit within limits
          
          // Debug logging
          console.log('=== Image Scale Calculation ===');
          console.log('Print size:', this.printSize);
          console.log('Processed image dimensions:', imageWidth, 'x', imageHeight);
          console.log('Max allowed dimensions (print size limit):', maxImageWidth, 'x', maxImageHeight);
          console.log('Calculated maxScale:', maxScale);
          console.log('Final calculated scale:', calculatedScale);
          console.log('Scaled dimensions (will be rendered at):', 
            (imageWidth * calculatedScale).toFixed(2), 'x', 
            (imageHeight * calculatedScale).toFixed(2));
          console.log('Scale percentage:', (calculatedScale * 100).toFixed(2) + '%');
          
          // Set scale FIRST, before setting userImage
          this.imageScale = calculatedScale;
          
          // Center image in editable area - using configuration constant (matches Flutter line 428)
          this.imageX = centerX;
          this.imageY = centerY;
          this.imageRotation = 0;
          
          // Set image as selected to show border and handles
          this.isImageSelected = true;
          
          // Set userImage AFTER setting scale to ensure render uses correct scale
          this.userImage = processedImg;
          
          // Keep upload overlay visible
          // The upload button should remain visible in top-right corner
          
          // Force immediate render with correct scale using requestAnimationFrame to ensure DOM is ready
          // This ensures the scale is applied immediately when image is displayed
          requestAnimationFrame(() => {
            // Double-check scale is still correct before rendering
            console.log('=== Before Render ===');
            console.log('imageScale value:', this.imageScale);
            console.log('userImage dimensions:', this.userImage.width, 'x', this.userImage.height);
            console.log('Canvas actual size:', this.canvas.width, 'x', this.canvas.height);
            console.log('Canvas CSS size:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
            console.log('Expected rendered size:', 
              (this.userImage.width * this.imageScale).toFixed(2), 'x', 
              (this.userImage.height * this.imageScale).toFixed(2));
            
            // Check if canvas CSS size matches actual size (could cause scaling issues)
            const cssWidth = this.canvas.clientWidth;
            const cssHeight = this.canvas.clientHeight;
            const actualWidth = this.canvas.width;
            const actualHeight = this.canvas.height;
            
            if (cssWidth !== actualWidth || cssHeight !== actualHeight) {
              console.warn('⚠️ Canvas CSS size does not match actual size!');
              console.warn('CSS:', cssWidth, 'x', cssHeight, 'vs Actual:', actualWidth, 'x', actualHeight);
              console.warn('This may cause the image to appear at the wrong size.');
            }
            
            // Ensure scale is still set correctly
            if (Math.abs(this.imageScale - calculatedScale) > 0.001) {
              console.warn('⚠️ Image scale was modified! Resetting to calculated scale.');
              console.warn('Previous scale:', this.imageScale, '-> New scale:', calculatedScale);
              this.imageScale = calculatedScale;
            }
            
            this.render();
            
            // Verify scale after render
            console.log('=== After Render ===');
            console.log('Final imageScale:', this.imageScale);
            console.log('Final rendered dimensions:', 
              (this.userImage.width * this.imageScale).toFixed(2), 'x', 
              (this.userImage.height * this.imageScale).toFixed(2));
            console.log('Canvas size after render:', this.canvas.width, 'x', this.canvas.height);
            console.log('Canvas CSS size after render:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
            console.log('=== Image Upload Complete ===');
          });
          
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  render() {
    if (!this.tshirtImage) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background
    const bgColor = this.tshirtColor === 'black' ? '#E0E0E0' : '#4A4A4A';
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw t-shirt image
    const imageAspectRatio = this.tshirtImage.width / this.tshirtImage.height;
    const canvasAspectRatio = this.canvas.width / this.canvas.height;
    
    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;
    
    if (imageAspectRatio > canvasAspectRatio) {
      displayWidth = this.canvas.width;
      displayHeight = this.canvas.width / imageAspectRatio;
      offsetY = (this.canvas.height - displayHeight) / 2;
    } else {
      displayHeight = this.canvas.height;
      displayWidth = this.canvas.height * imageAspectRatio;
      offsetX = (this.canvas.width - displayWidth) / 2;
    }
    
    this.ctx.drawImage(this.tshirtImage, offsetX, offsetY, displayWidth, displayHeight);
    
    // Draw editable area border (hidden - commented out)
    // this.drawEditableArea();
    
    // Draw user image if loaded
    if (this.userImage) {
      this.ctx.save();
      this.ctx.translate(this.imageX, this.imageY);
      this.ctx.rotate(this.imageRotation);
      
      const imageWidth = this.userImage.width * this.imageScale;
      const imageHeight = this.userImage.height * this.imageScale;
      
      // Debug: Log actual drawing dimensions
      if (Math.random() < 0.01) { // Only log occasionally to avoid spam
        console.log('=== Render Debug ===');
        console.log('Canvas actual size:', this.canvas.width, 'x', this.canvas.height);
        console.log('Canvas CSS size:', this.canvas.clientWidth, 'x', this.canvas.clientHeight);
        console.log('Drawing image at:', imageWidth.toFixed(2), 'x', imageHeight.toFixed(2));
        console.log('Image position:', this.imageX.toFixed(2), ',', this.imageY.toFixed(2));
        console.log('Image scale:', this.imageScale);
      }
      
      this.ctx.drawImage(
        this.userImage,
        -imageWidth / 2,
        -imageHeight / 2,
        imageWidth,
        imageHeight
      );
      
      // Draw border and corner handles when image is uploaded (always show)
      if (this.isImageSelected) {
        this.drawImageBorder(imageWidth / 2, imageHeight / 2);
      }
      
      this.ctx.restore();
    }
  }
  
  drawEditableArea() {
    // Calculate editable area dimensions
    const editableAreaWidth = this.canvasWidth * this.editableAreaWidthRatio;
    const editableAreaHeight = this.canvasHeight * this.editableAreaHeightRatio;
    const centerX = this.canvasWidth / 2 + 5; // Offset 20px to the right
    const centerY = this.canvasHeight / 2 + (this.canvasHeight * this.editableAreaVerticalOffsetRatio);
    
    // Draw dashed border for editable area
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.5)'; // Semi-transparent pink
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    
    // Draw rectangle centered at (centerX, centerY)
    const x = centerX - editableAreaWidth / 2;
    const y = centerY - editableAreaHeight / 2;
    this.ctx.strokeRect(x, y, editableAreaWidth, editableAreaHeight);
    
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }
  
  drawImageBorder(imageHalfWidth, imageHalfHeight) {
    const handleSize = Math.max(12, Math.min(imageHalfWidth * 2, imageHalfHeight * 2) * 0.08);
    
    // Draw dashed border
    this.ctx.strokeStyle = '#FF6B9D';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    
    this.ctx.strokeRect(-imageHalfWidth, -imageHalfHeight, imageHalfWidth * 2, imageHalfHeight * 2);
    this.ctx.setLineDash([]);
    
    // Draw corner handles
    const corners = [
      { x: -imageHalfWidth, y: -imageHalfHeight },
      { x: imageHalfWidth, y: -imageHalfHeight },
      { x: -imageHalfWidth, y: imageHalfHeight },
      { x: imageHalfWidth, y: imageHalfHeight }
    ];
    
    this.ctx.fillStyle = '#FF6B9D';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    
    for (const corner of corners) {
      this.ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
      this.ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize);
    }
  }
  
  setPrintSize(size) {
    // This matches Flutter's didUpdateWidget logic (lines 223-235)
    const oldPrintSize = this.printSize;
    this.printSize = size;
    const prices = { small: 28.0, standard: 35.0, large: 45.0 };
    this.price = prices[size] || 45.0;
    
    // Update UI
    document.querySelectorAll('.print-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    
    // Adjust image scale when print size changes (matches Flutter)
    if (this.userImage && oldPrintSize !== size) {
      // Use requestAnimationFrame to ensure canvas size is available (matches Flutter's postFrameCallback)
      requestAnimationFrame(() => {
        if (this.canvasWidth > 0 && this.canvasHeight > 0) {
          this.adjustImageForPrintSize();
        }
      });
    }
    
    this.updateUI();
  }
  
  adjustImageForPrintSize() {
    // This matches Flutter's _adjustImageForPrintSize exactly (lines 238-281)
    if (!this.userImage || this.canvasWidth === 0 || this.canvasHeight === 0) {
      return;
    }
    
    const imageWidth = this.userImage.width;
    const imageHeight = this.userImage.height;
    let targetScale;
    
    // Get print size limits
    const maxImageWidth = this.getMaxImageWidth(this.printSize);
    const maxImageHeight = this.getMaxImageHeight(this.printSize);
    
    console.log('=== Adjusting Image for Print Size ===');
    console.log('New print size:', this.printSize);
    console.log('Current image dimensions:', imageWidth, 'x', imageHeight);
    console.log('Max allowed dimensions:', maxImageWidth, 'x', maxImageHeight);
    console.log('Current imageScale:', this.imageScale);
    console.log('Current scaled dimensions:', 
      (imageWidth * this.imageScale).toFixed(2), 'x', 
      (imageHeight * this.imageScale).toFixed(2));
    
    switch (this.printSize) {
      case 'small':
        // Small: adjust image to 100x100 (maintain aspect ratio, fit within 100x100)
        // STRICTLY enforce 100x100 limit
        const scaleXSmall = 100.0 / imageWidth;
        const scaleYSmall = 100.0 / imageHeight;
        targetScale = Math.min(scaleXSmall, scaleYSmall); // Use smaller scale to fit within 100x100
        break;
      
      case 'standard':
        // Standard: adjust image to 220x200 (maintain aspect ratio, fit within 220x200)
        // STRICTLY enforce 220x200 limit - same logic as small logo
        const scaleXStandard = 220.0 / imageWidth;
        const scaleYStandard = 200.0 / imageHeight;
        targetScale = Math.min(scaleXStandard, scaleYStandard); // Use smaller scale to fit within 220x200
        break;
      
      case 'large':
      default:
        // Large: adjust image to 90% of editable area
        // STRICTLY enforce the limit - same logic as small logo
        const editableAreaWidth = this.canvasWidth * this.editableAreaWidthRatio;
        const editableAreaHeight = this.canvasHeight * this.editableAreaHeightRatio;
        const maxWidthLarge = editableAreaWidth * 0.9;
        const maxHeightLarge = editableAreaHeight * 0.9;
        const scaleXLarge = maxWidthLarge / imageWidth;
        const scaleYLarge = maxHeightLarge / imageHeight;
        targetScale = Math.min(scaleXLarge, scaleYLarge); // Use smaller scale to fit within 90% of editable area
        break;
    }
    
    // Apply the new scale
    // For all print sizes, allow very small scales to fit within limits
    // Don't clamp to 3.0 for any size - they all need to fit within their limits
    const clampedScale = Math.max(0.01, targetScale); // Allow very small scales for all sizes
    
    console.log('Calculated targetScale:', targetScale);
    console.log('Clamped scale:', clampedScale);
    console.log('New scaled dimensions:', 
      (imageWidth * clampedScale).toFixed(2), 'x', 
      (imageHeight * clampedScale).toFixed(2));
    
    // ALWAYS apply the new scale based on original image size and new print size limit
    // This ensures the image always fits within the selected print size, regardless of current scale
    const originalScaledWidth = imageWidth * clampedScale;
    const originalScaledHeight = imageHeight * clampedScale;
    
    console.log('Original image size:', imageWidth, 'x', imageHeight);
    console.log('Applying scale to original image size');
    console.log('Resulting size:', originalScaledWidth.toFixed(2), 'x', originalScaledHeight.toFixed(2));
    console.log('Print size limit:', maxImageWidth, 'x', maxImageHeight);
    
    // Verify the scaled size fits within limits
    if (originalScaledWidth > maxImageWidth || originalScaledHeight > maxImageHeight) {
      console.warn('⚠️ Calculated size still exceeds limit! This should not happen.');
      console.warn('Scaled:', originalScaledWidth.toFixed(2), 'x', originalScaledHeight.toFixed(2));
      console.warn('Limit:', maxImageWidth, 'x', maxImageHeight);
    }
    
    // Always apply the new scale - always recalculate based on original image size
    this.imageScale = clampedScale;
    
    console.log('Final imageScale after adjustment:', this.imageScale);
    console.log('Final scaled dimensions (from original image):', 
      (imageWidth * this.imageScale).toFixed(2), 'x', 
      (imageHeight * this.imageScale).toFixed(2));
    console.log('=== Image Adjustment Complete ===');
    
    // Re-render with new scale
    this.render();
  }
  
  setSize(size) {
    this.size = size;
    document.getElementById('selectedSize').textContent = size;
    
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
  }
  
  setTshirtColor(color) {
    this.tshirtColor = color;
    document.getElementById('selectedColor').textContent = color.charAt(0).toUpperCase() + color.slice(1);
    
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    
    this.loadTshirtImage();
  }
  
  setQuantity(quantity) {
    this.quantity = Math.max(1, Math.min(100, quantity));
    document.getElementById('quantityInput').value = this.quantity;
    
    const decrementBtn = document.getElementById('decrementBtn');
    const incrementBtn = document.getElementById('incrementBtn');
    decrementBtn.disabled = this.quantity <= 1;
    incrementBtn.disabled = this.quantity >= 100;
    
    this.updateUI();
  }
  
  setRotation(rotation) {
    this.imageRotation = rotation;
    document.getElementById('resetRotationGroup').style.display = 
      Math.abs(this.imageRotation) > 0.01 ? 'block' : 'none';
    this.render();
  }
  
  updateUI() {
    const priceDisplay = document.getElementById('priceDisplay');
    priceDisplay.innerHTML = `<span class="price-value">$${this.price.toFixed(2)}</span><span class="price-note">(Price per T-Shirt)</span>`;
    // Update size button active state
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === this.size);
    });
  }
  
  showUploadImageDialog() {
    const dialog = document.getElementById('uploadImageDialog');
    if (dialog) {
      dialog.classList.add('show');
    }
  }
  
  hideUploadImageDialog() {
    const dialog = document.getElementById('uploadImageDialog');
    if (dialog) {
      dialog.classList.remove('show');
    }
  }
  
  async checkout() {
    if (!this.userImage) {
      this.showUploadImageDialog();
      return;
    }
    
    // Convert canvas to image data
    const canvas = document.createElement('canvas');
    canvas.width = this.canvas.width;
    canvas.height = this.canvas.height;
    const ctx = canvas.getContext('2d');
    
    // Draw t-shirt background
    const bgColor = this.tshirtColor === 'black' ? '#E0E0E0' : '#4A4A4A';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw t-shirt
    const imageAspectRatio = this.tshirtImage.width / this.tshirtImage.height;
    const canvasAspectRatio = canvas.width / canvas.height;
    let displayWidth, displayHeight, offsetX = 0, offsetY = 0;
    
    if (imageAspectRatio > canvasAspectRatio) {
      displayWidth = canvas.width;
      displayHeight = canvas.width / imageAspectRatio;
      offsetY = (canvas.height - displayHeight) / 2;
    } else {
      displayHeight = canvas.height;
      displayWidth = canvas.height * imageAspectRatio;
      offsetX = (canvas.width - displayWidth) / 2;
    }
    
    ctx.drawImage(this.tshirtImage, offsetX, offsetY, displayWidth, displayHeight);
    
    // Draw user image
    if (this.userImage) {
      ctx.save();
      ctx.translate(this.imageX, this.imageY);
      ctx.rotate(this.imageRotation);
      
      const imageWidth = this.userImage.width * this.imageScale;
      const imageHeight = this.userImage.height * this.imageScale;
      
      ctx.drawImage(
        this.userImage,
        -imageWidth / 2,
        -imageHeight / 2,
        imageWidth,
        imageHeight
      );
      ctx.restore();
    }
    
    const imageData = canvas.toDataURL('image/png');
    
    // Store preview image in sessionStorage for order summary page
    try {
      sessionStorage.setItem('checkout_preview_image', imageData);
      console.log('Checkout: Preview image stored in sessionStorage');
    } catch (e) {
      console.error('Checkout: Failed to store preview image:', e);
    }
    
    // Store order data in sessionStorage for POST-like behavior
    const orderData = {
      size: this.size,
      quantity: this.quantity.toString(),
      price: this.price.toFixed(2),
      type: this.type,
      printSize: this.printSize,
      tshirtColor: this.tshirtColor,
      imageX: this.imageX.toFixed(2),
      imageY: this.imageY.toFixed(2),
      imageScale: this.imageScale.toFixed(2),
      imageRotation: this.imageRotation.toFixed(2),
      originalImageUrl: this.originalImageUrl || ''
    };
    
    try {
      sessionStorage.setItem('order_data', JSON.stringify(orderData));
      console.log('Checkout: Order data stored in sessionStorage:', orderData);
    } catch (e) {
      console.error('Checkout: Failed to store order data:', e);
    }
    
    // Navigate to order-summary page (data will be read from sessionStorage)
    // Use GET navigation instead of POST (Shopify pages don't support POST)
    const targetUrl = '/pages/order-summary';
    console.log('Checkout: Navigating to', targetUrl);
    window.location.href = targetUrl;
  }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.editor = new TshirtEditor();
});

