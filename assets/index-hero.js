/**
 * Index Hero Slider
 * Handles banner carousel functionality with autoplay support
 */

class IndexHeroSlider {
  constructor(container) {
    this.container = container;
    this.slider = container.querySelector('[data-hero-slider]');
    this.slides = container.querySelectorAll('.index-hero__slide');
    this.prevButton = container.querySelector('[data-slider-prev]');
    this.nextButton = container.querySelector('[data-slider-next]');
    this.dots = container.querySelectorAll('[data-slider-dots] button');
    this.currentIndex = 0;
    this.autoplayInterval = null;
    this.autoplayDelay = parseInt(container.dataset.autoplayInterval || 5000);
    this.isTransitioning = false;

    this.init();
  }

  init() {
    if (this.slides.length <= 1) {
      return;
    }

    // Bind event listeners
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.goToPrevSlide());
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.goToNextSlide());
    }

    // Bind dot navigation
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.goToSlide(index));
    });

    // Touch/swipe support for mobile
    this.addTouchSupport();

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.goToPrevSlide();
      } else if (e.key === 'ArrowRight') {
        this.goToNextSlide();
      }
    });

    // Pause autoplay on hover
    this.container.addEventListener('mouseenter', () => this.pauseAutoplay());
    this.container.addEventListener('mouseleave', () => this.startAutoplay());

    // Start autoplay if delay is set
    if (this.autoplayDelay > 0) {
      this.startAutoplay();
    }
  }

  goToSlide(index) {
    if (this.isTransitioning || index === this.currentIndex) {
      return;
    }

    this.isTransitioning = true;

    // Remove active class from current slide and dot
    this.slides[this.currentIndex].classList.remove('active');
    if (this.dots[this.currentIndex]) {
      this.dots[this.currentIndex].classList.remove('active');
    }

    // Update current index
    this.currentIndex = index;

    // Add active class to new slide and dot
    this.slides[this.currentIndex].classList.add('active');
    if (this.dots[this.currentIndex]) {
      this.dots[this.currentIndex].classList.add('active');
    }

    // Reset transition flag after animation
    setTimeout(() => {
      this.isTransitioning = false;
    }, 600);
  }

  goToNextSlide() {
    const nextIndex = (this.currentIndex + 1) % this.slides.length;
    this.goToSlide(nextIndex);
  }

  goToPrevSlide() {
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prevIndex);
  }

  startAutoplay() {
    if (this.autoplayDelay <= 0) {
      return;
    }

    this.pauseAutoplay();
    this.autoplayInterval = setInterval(() => {
      this.goToNextSlide();
    }, this.autoplayDelay);
  }

  pauseAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  addTouchSupport() {
    let touchStartX = 0;
    let touchEndX = 0;
    let minSwipeDistance = 50;

    this.container.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      this.pauseAutoplay();
    }, { passive: true });

    this.container.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0) {
          // Swipe left - next slide
          this.goToNextSlide();
        } else {
          // Swipe right - previous slide
          this.goToPrevSlide();
        }
      }

      // Restart autoplay after swipe
      if (this.autoplayDelay > 0) {
        setTimeout(() => this.startAutoplay(), 1000);
      }
    }, { passive: true });
  }
}

// Initialize slider when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const heroSections = document.querySelectorAll('.index-hero');
  heroSections.forEach((section) => {
    new IndexHeroSlider(section);
  });
});

// Re-initialize on section load (for Shopify theme editor)
if (Shopify && Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const heroSection = event.detail.querySelector('.index-hero');
    if (heroSection) {
      new IndexHeroSlider(heroSection);
    }
  });
}

