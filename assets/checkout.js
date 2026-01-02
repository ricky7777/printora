/**
 * Checkout Page JavaScript
 */

class CheckoutPage {
  constructor() {
    this.params = new URLSearchParams(window.location.search);
    this.init();
  }
  
  init() {
    this.loadPreview();
    this.displayOrderSummary();
    this.setupForm();
  }
  
  loadPreview() {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    
    const tshirtColor = this.params.get('tshirtColor') || 'black';
    const imageData = this.params.get('imageData');
    const imageX = parseFloat(this.params.get('imageX') || '0');
    const imageY = parseFloat(this.params.get('imageY') || '0');
    const imageScale = parseFloat(this.params.get('imageScale') || '1');
    const imageRotation = parseFloat(this.params.get('imageRotation') || '0');
    
    // Load t-shirt image
    const tshirtImg = new Image();
    const assetBase = window.assetBaseUrl || '/assets/';
    tshirtImg.src = assetBase + `tee_${tshirtColor}.png`;
    
    tshirtImg.onload = () => {
      // Set canvas size
      canvas.width = tshirtImg.width;
      canvas.height = tshirtImg.height;
      
      // Draw t-shirt
      ctx.drawImage(tshirtImg, 0, 0);
      
      // Draw user image if provided
      if (imageData) {
        const userImg = new Image();
        userImg.onload = () => {
          // Calculate position and scale
          const scaleRatio = canvas.width / 800; // Assuming editor canvas width is 800px
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2 + (canvas.height * 0.04);
          
          const editorCenterX = 800 / 2;
          const editorCenterY = 800 * 0.54;
          
          const userImgX = centerX + (imageX - editorCenterX) * scaleRatio;
          const userImgY = centerY + (imageY - editorCenterY) * scaleRatio;
          const userImgWidth = userImg.width * imageScale * scaleRatio;
          const userImgHeight = userImg.height * imageScale * scaleRatio;
          
          ctx.save();
          ctx.translate(userImgX, userImgY);
          ctx.rotate(imageRotation);
          ctx.drawImage(
            userImg,
            -userImgWidth / 2,
            -userImgHeight / 2,
            userImgWidth,
            userImgHeight
          );
          ctx.restore();
        };
        userImg.src = imageData;
      }
      
      // Scale canvas for display
      const maxDisplayWidth = 500;
      if (canvas.width > maxDisplayWidth) {
        const scale = maxDisplayWidth / canvas.width;
        canvas.style.width = (canvas.width * scale) + 'px';
        canvas.style.height = (canvas.height * scale) + 'px';
      }
    };
  }
  
  displayOrderSummary() {
    const tshirtColor = this.params.get('tshirtColor') || 'black';
    const size = this.params.get('size') || '-';
    const printSize = this.params.get('printSize') || '-';
    const quantity = parseInt(this.params.get('quantity') || '1');
    const price = parseFloat(this.params.get('price') || '0');
    
    document.getElementById('tshirtColorDisplay').textContent = 
      tshirtColor === 'black' ? 'Black' : 'White';
    document.getElementById('sizeDisplay').textContent = size;
    document.getElementById('printSizeDisplay').textContent = 
      printSize ? printSize.charAt(0).toUpperCase() + printSize.slice(1) : '-';
    document.getElementById('quantityDisplay').textContent = quantity.toString();
    document.getElementById('unitPriceDisplay').textContent = `$${price.toFixed(2)}`;
    document.getElementById('totalPriceDisplay').textContent = `$${(price * quantity).toFixed(2)}`;
  }
  
  setupForm() {
    const form = document.getElementById('checkoutForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const payButton = document.getElementById('payButton');
    
    function validateEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }
    
    function showError(elementId, message) {
      const errorElement = document.getElementById(elementId);
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }
    
    function hideError(elementId) {
      const errorElement = document.getElementById(elementId);
      errorElement.classList.remove('show');
    }
    
    nameInput.addEventListener('blur', function() {
      if (nameInput.value.trim() === '') {
        showError('nameError', 'Please enter your name');
      } else {
        hideError('nameError');
      }
    });
    
    emailInput.addEventListener('blur', function() {
      if (emailInput.value.trim() === '') {
        showError('emailError', 'Please enter your email address');
      } else if (!validateEmail(emailInput.value)) {
        showError('emailError', 'Please enter a valid email address');
      } else {
        hideError('emailError');
      }
    });
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let isValid = true;
      
      if (nameInput.value.trim() === '') {
        showError('nameError', 'Please enter your name');
        isValid = false;
      } else {
        hideError('nameError');
      }
      
      if (emailInput.value.trim() === '') {
        showError('emailError', 'Please enter your email address');
        isValid = false;
      } else if (!validateEmail(emailInput.value)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
      } else {
        hideError('emailError');
      }
      
      const paymentMethod = document.querySelector('input[name="payment"]:checked');
      if (!paymentMethod) {
        isValid = false;
      }
      
      if (!isValid) {
        return;
      }
      
      // Disable button
      payButton.disabled = true;
      payButton.textContent = 'Processing...';
      
      // Collect form data
      const formData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        paymentMethod: paymentMethod.value,
        ...Object.fromEntries(this.params)
      };
      
      // TODO: Send to Shopify cart/checkout
      console.log('Checkout data:', formData);
      
      // Simulate processing
      setTimeout(() => {
        alert('Payment processed successfully!\n\nOrder Details:\n' +
          'Name: ' + formData.name + '\n' +
          'Email: ' + formData.email + '\n' +
          'Payment Method: ' + formData.paymentMethod + '\n' +
          'Total: $' + (parseFloat(formData.price) * parseInt(formData.quantity)).toFixed(2) + '\n\n' +
          'This is a demo. In production, this would process the actual payment.');
        
        payButton.disabled = false;
        payButton.textContent = 'Pay Now';
      }, 2000);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CheckoutPage();
});


