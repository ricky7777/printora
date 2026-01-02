/**
 * T-Shirt Editor JavaScript
 * Converted from Flutter implementation
 */

class TshirtEditor {
  constructor() {
    // State
    this.tshirtColor = 'black';
    this.size = 'M';
    this.quantity = 1;
    this.printSize = 'large';
    this.price = 45.0;
    this.type = 'standard-print';
    
    // Image properties
    this.userImage = null;
    this.tshirtImage = null;
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
    this.editableAreaWidthRatio = 0.3;
    this.editableAreaHeightRatio = 0.7;
    this.editableAreaVerticalOffsetRatio = 0.04;
    
    // Interaction state
    this.isDragging = false;
    this.isScaling = false;
    this.activeCorner = null;
    this.lastTouchDistance = 0;
    this.lastTouchAngle = 0;
    this.initialTouchCenter = null;
    this.initialImageState = null;
    
    // Initialize
    this.init();
  }
  
  init() {
    // Load URL parameters
    this.loadUrlParameters();
    
    // Load t-shirt image
    this.loadTshirtImage();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup canvas
    this.setupCanvas();
  }
  
  loadUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const priceParam = urlParams.get('price');
    const typeParam = urlParams.get('type');
    
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
    
    if (priceParam) {
      const price = parseFloat(priceParam);
      if (price > 0) {
        this.price = price;
      }
    }
    
    this.updateUI();
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
    // Asset URL will be set from Liquid template
    const assetBase = window.assetBaseUrl || '/assets/';
    tshirtImage.src = assetBase + `tee_${this.tshirtColor}.png`;
    
    return new Promise((resolve, reject) => {
      tshirtImage.onload = () => {
        this.tshirtImage = tshirtImage;
        this.render();
        resolve();
      };
      tshirtImage.onerror = reject;
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
      this.setQuantity(Math.min(this.quantity + 1, 300));
    });
    
    document.getElementById('decrementBtn').addEventListener('click', () => {
      this.setQuantity(Math.max(this.quantity - 1, 1));
    });
    
    // Reset rotation button
    document.getElementById('resetRotationBtn').addEventListener('click', () => {
      this.imageRotation = 0;
      document.getElementById('resetRotationGroup').style.display = 'none';
      this.render();
    });
    
    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', () => {
      this.checkout();
    });
    
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
  }
  
  setupCanvasInteractions() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onPointerUp(e));
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.onTouchStart(e);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.onTouchMove(e);
    });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onTouchEnd(e);
    });
  }
  
  onPointerDown(e) {
    if (!this.userImage) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Check if click is on a corner handle
    const corner = this.getCornerAtPoint(point);
    if (corner) {
      this.activeCorner = corner;
      this.initialImageState = {
        scale: this.imageScale,
        rotation: this.imageRotation,
        focalPoint: point
      };
      this.isScaling = true;
    } else if (this.isPointInImage(point)) {
      this.isDragging = true;
      this.initialTouchCenter = point;
      this.initialImageState = {
        x: this.imageX,
        y: this.imageY
      };
    }
  }
  
  onPointerMove(e) {
    if (!this.userImage) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    if (this.isDragging && this.initialImageState) {
      const deltaX = point.x - this.initialTouchCenter.x;
      const deltaY = point.y - this.initialTouchCenter.y;
      
      let newX = this.initialImageState.x + deltaX;
      let newY = this.initialImageState.y + deltaY;
      
      // Constrain to editable area
      const constrained = this.constrainPosition(newX, newY);
      this.imageX = constrained.x;
      this.imageY = constrained.y;
      
      this.render();
    } else if (this.isScaling && this.activeCorner && this.initialImageState) {
      this.handleCornerResize(point);
    }
  }
  
  onPointerUp(e) {
    this.isDragging = false;
    this.isScaling = false;
    this.activeCorner = null;
    this.initialTouchCenter = null;
    this.initialImageState = null;
  }
  
  onTouchStart(e) {
    if (!this.userImage) return;
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      
      const corner = this.getCornerAtPoint(point);
      if (corner) {
        this.activeCorner = corner;
        this.initialImageState = {
          scale: this.imageScale,
          rotation: this.imageRotation,
          focalPoint: point
        };
        this.isScaling = true;
      } else if (this.isPointInImage(point)) {
        this.isDragging = true;
        this.initialTouchCenter = point;
        this.initialImageState = {
          x: this.imageX,
          y: this.imageY
        };
      }
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.isScaling = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const rect = this.canvas.getBoundingClientRect();
      const point1 = {
        x: touch1.clientX - rect.left,
        y: touch1.clientY - rect.top
      };
      const point2 = {
        x: touch2.clientX - rect.left,
        y: touch2.clientY - rect.top
      };
      
      const distance = this.getDistance(point1, point2);
      const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);
      const center = {
        x: (point1.x + point2.x) / 2,
        y: (point1.y + point2.y) / 2
      };
      
      this.lastTouchDistance = distance;
      this.lastTouchAngle = angle;
      this.initialTouchCenter = center;
      this.initialImageState = {
        scale: this.imageScale,
        rotation: this.imageRotation,
        centerX: this.imageX,
        centerY: this.imageY
      };
    }
  }
  
  onTouchMove(e) {
    if (!this.userImage) return;
    
    e.preventDefault();
    
    if (e.touches.length === 1 && this.isDragging && this.initialImageState) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      
      const deltaX = point.x - this.initialTouchCenter.x;
      const deltaY = point.y - this.initialTouchCenter.y;
      
      let newX = this.initialImageState.x + deltaX;
      let newY = this.initialImageState.y + deltaY;
      
      const constrained = this.constrainPosition(newX, newY);
      this.imageX = constrained.x;
      this.imageY = constrained.y;
      
      this.render();
    } else if (e.touches.length === 2 && this.isScaling && this.initialImageState) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const rect = this.canvas.getBoundingClientRect();
      const point1 = {
        x: touch1.clientX - rect.left,
        y: touch1.clientY - rect.top
      };
      const point2 = {
        x: touch2.clientX - rect.left,
        y: touch2.clientY - rect.top
      };
      
      const distance = this.getDistance(point1, point2);
      const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);
      
      // Scale
      const scaleFactor = distance / this.lastTouchDistance;
      let newScale = this.initialImageState.scale * scaleFactor;
      newScale = Math.max(0.1, Math.min(3.0, newScale));
      this.imageScale = newScale;
      
      // Rotation
      const angleDelta = angle - this.lastTouchAngle;
      this.imageRotation = this.initialImageState.rotation + angleDelta;
      
      this.render();
    } else if (this.activeCorner && this.isScaling && this.initialImageState) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const point = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      this.handleCornerResize(point);
    }
  }
  
  onTouchEnd(e) {
    this.isDragging = false;
    this.isScaling = false;
    this.activeCorner = null;
    this.initialTouchCenter = null;
    this.initialImageState = null;
    this.lastTouchDistance = 0;
    this.lastTouchAngle = 0;
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
  
  handleCornerResize(currentPoint) {
    if (!this.initialImageState || !this.userImage) return;
    
    const center = { x: this.imageX, y: this.imageY };
    const initialDistance = this.getDistance(this.initialImageState.focalPoint, center);
    const currentDistance = this.getDistance(currentPoint, center);
    
    if (initialDistance > 0) {
      const scaleFactor = currentDistance / initialDistance;
      let newScale = this.initialImageState.scale * scaleFactor;
      newScale = Math.max(0.1, Math.min(3.0, newScale));
      this.imageScale = newScale;
      this.render();
    }
  }
  
  constrainPosition(x, y) {
    if (!this.userImage) return { x, y };
    
    const imageHalfWidth = (this.userImage.width * this.imageScale) / 2;
    const imageHalfHeight = (this.userImage.height * this.imageScale) / 2;
    
    const absCos = Math.abs(Math.cos(this.imageRotation));
    const absSin = Math.abs(Math.sin(this.imageRotation));
    const boundingHalfWidth = imageHalfWidth * absCos + imageHalfHeight * absSin;
    const boundingHalfHeight = imageHalfWidth * absSin + imageHalfHeight * Math.abs(Math.cos(this.imageRotation));
    
    const editableAreaWidth = (this.canvasWidth * this.editableAreaWidthRatio) / 2;
    const editableAreaHeight = (this.canvasHeight * this.editableAreaHeightRatio) / 2;
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2 + (this.canvasHeight * this.editableAreaVerticalOffsetRatio);
    
    const constrainedX = Math.max(
      centerX - editableAreaWidth + boundingHalfWidth,
      Math.min(centerX + editableAreaWidth - boundingHalfWidth, x)
    );
    const constrainedY = Math.max(
      centerY - editableAreaHeight + boundingHalfHeight,
      Math.min(centerY + editableAreaHeight - boundingHalfHeight, y)
    );
    
    return { x: constrainedX, y: constrainedY };
  }
  
  async loadUserImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.userImage = img;
          
          // Center image
          const centerX = this.canvasWidth / 2;
          const centerY = this.canvasHeight / 2 + (this.canvasHeight * this.editableAreaVerticalOffsetRatio);
          
          // Calculate initial scale
          const editableAreaWidth = this.canvasWidth * this.editableAreaWidthRatio;
          const editableAreaHeight = this.canvasHeight * this.editableAreaHeightRatio;
          const scaleX = editableAreaWidth / img.width;
          const scaleY = editableAreaHeight / img.height;
          const initialScale = Math.min(scaleX, scaleY) * 0.9;
          
          this.imageX = centerX;
          this.imageY = centerY;
          this.imageScale = Math.max(0.1, Math.min(initialScale, 3.0));
          this.imageRotation = 0;
          
          // Hide upload overlay
          document.getElementById('uploadOverlay').style.display = 'none';
          document.getElementById('instructions').style.display = 'block';
          
          this.render();
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
    
    // Draw user image if loaded
    if (this.userImage) {
      this.ctx.save();
      this.ctx.translate(this.imageX, this.imageY);
      this.ctx.rotate(this.imageRotation);
      
      const imageWidth = this.userImage.width * this.imageScale;
      const imageHeight = this.userImage.height * this.imageScale;
      
      this.ctx.drawImage(
        this.userImage,
        -imageWidth / 2,
        -imageHeight / 2,
        imageWidth,
        imageHeight
      );
      
      // Draw border and corner handles
      this.drawImageBorder(imageWidth / 2, imageHeight / 2);
      
      this.ctx.restore();
    }
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
    this.printSize = size;
    const prices = { small: 28.0, standard: 35.0, large: 45.0 };
    this.price = prices[size] || 45.0;
    
    // Update UI
    document.querySelectorAll('.print-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
    
    this.updateUI();
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
    this.quantity = Math.max(1, Math.min(300, quantity));
    document.getElementById('quantityInput').value = this.quantity;
    
    const decrementBtn = document.getElementById('decrementBtn');
    const incrementBtn = document.getElementById('incrementBtn');
    decrementBtn.disabled = this.quantity <= 1;
    incrementBtn.disabled = this.quantity >= 300;
    
    this.updateUI();
  }
  
  setRotation(rotation) {
    this.imageRotation = rotation;
    document.getElementById('resetRotationGroup').style.display = 
      Math.abs(this.imageRotation) > 0.01 ? 'block' : 'none';
    this.render();
  }
  
  updateUI() {
    document.getElementById('priceDisplay').textContent = `$${this.price.toFixed(2)}`;
  }
  
  async checkout() {
    if (!this.userImage) {
      alert('Please upload an image first');
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
    
    // Build checkout URL with parameters
    const params = new URLSearchParams({
      imageData: imageData,
      size: this.size,
      quantity: this.quantity.toString(),
      price: this.price.toFixed(2),
      type: this.type,
      printSize: this.printSize,
      tshirtColor: this.tshirtColor,
      imageX: this.imageX.toFixed(2),
      imageY: this.imageY.toFixed(2),
      imageScale: this.imageScale.toFixed(2),
      imageRotation: this.imageRotation.toFixed(2)
    });
    
    // Always navigate to /pages/order-summary (both local and production)
    window.location.href = `/pages/order-summary?${params.toString()}`;
  }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.editor = new TshirtEditor();
});

