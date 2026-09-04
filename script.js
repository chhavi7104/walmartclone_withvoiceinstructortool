// Product and cart data are loaded from the FastAPI backend.
const API_BASE_URL = (window.VOCALCART_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const SESSION_STORAGE_KEY = 'vocalCartSessionId';
const sessionId = getOrCreateSessionId();
let products = [];
let cart = [];
let cartSummary = { total_quantity: 0, subtotal: 0, total: 0 };

function getOrCreateSessionId() {
    let id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
        id = window.crypto && window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        localStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            ...(options.headers || {})
        }
    });
    if (!response.ok) {
        let detail = '';
        try {
            const body = await response.json();
            detail = body.detail || '';
        } catch (_) {
            detail = '';
        }
        throw new Error(detail || 'Cart service is unavailable');
    }
    return response.json();
}

async function fetchProducts() {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    if (!response.ok) {
        throw new Error('Failed to load products');
    }
    products = await response.json();
    return products;
}

async function searchProducts(query) {
    const response = await fetch(
        `${API_BASE_URL}/api/products/search?q=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
        return [];
    }
    return response.json();
}

async function fetchProductById(productId) {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}`);
    if (!response.ok) {
        return null;
    }
    return response.json();
}

// DOM Elements
const productGrid = document.getElementById('product-grid');
const categoryFilter = document.getElementById('category-filter');
const cartCount = document.getElementById('cart-count');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const cartItems = document.getElementById('cart-items');
const cartTotalAmount = document.getElementById('cart-total-amount');
const checkoutBtn = document.getElementById('checkout-btn');
const voiceBtn = document.getElementById('voice-btn');
const voicePanel = document.getElementById('voice-panel');
const closeVoice = document.getElementById('close-voice');
const voiceStatusText = document.getElementById('voice-status-text');
const startListeningBtn = document.getElementById('start-listening');
const commandLog = document.getElementById('command-log');
const helpBtn = document.getElementById('help-btn');

// Voice recognition variables
let recognition;
let isListening = false;
const visualizerBars = document.querySelectorAll('.voice-visualizer .bar');

// Product similar words mapping (matches your Python code)
const productSimilarWords = {
    "smartphone pro": ["phone", "mobile", "device", "smart phone", "smartphone", "cell phone", "handset", "telephone", "mobile phone", "smartfone", "fone", "celphone", "smatphone", "smartfon"],
    "luxury laptop": ["notebook", "ultrabook", "labtop", "lapptop", "computer", "macbook", "lap top", "leptop", "loptop", "notbuk", "labtop"],
    "noise-canceling headphones": ["headset", "earphones", "head phones", "noise canceling", "ear pods", "head phone", "noise cancelling", "headfones", "hedphones", "noise cansling", "earbuds"],
    "premium whiskey": ["whisky", "scotch", "bourbon", "wiskey", "wisky", "whiskey", "whiski", "wine", "liquor", "whiskyy", "wee whiskey", "wiskyy"],
    "imported champagne": ["shampain", "champane", "sparkling wine", "champaign", "shampagne", "bubbly", "champers", "spumante", "sham pain", "cham pagne"],
    "designer handbag": ["purse", "bag", "clutch", "hand bag", "designer purse", "hanbag", "purs", "designer bag", "hand bug"],
    "organic matcha set": ["green tea", "matcha", "macha", "mat cha", "tea set", "organic tea", "green tea powder", "japanese tea"],
    "artisan coffee beans": ["specialty coffee", "coffee", "artisan coffee", "beans", "gourmet coffee", "premium coffee", "cofee", "coffe"]
};

// Command variations (matches your Python code)
const commandVariations = {
    "cart": ["card", "cart", "kart", "guard", "car", "basket", "bag", "bascet", "kar", "gart", "carrt", "shopping cart", "basket", "shopping bag", "shopping", "kar", "kard"],
    "add": ["ad", "at", "aid", "and", "put", "include", "want", "select", "choose", "pick", "order", "buy", "purchase", "get", "take"],
    "remove": ["delete", "removed", "removal", "re move", "take out", "cancel", "erase", "omit", "drop", "scratch", "undo", "pull out"],
    "checkout": ["check out", "cheque out", "checkout", "pay now", "complete", "finish", "purchase", "buy now", "pay", "payment", "finalize", "complete order"]
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await fetchProducts();
        await refreshCart(false);
        loadProducts();
    } catch (error) {
        console.error(error);
        productGrid.innerHTML = '<p>Unable to load products. Is the backend running?</p>';
    }

    updateCartCount();
    
    // Initialize voice recognition if available
    initVoiceRecognition();
});

// Load products based on category filter
function loadProducts() {
    productGrid.innerHTML = '';
    const category = categoryFilter.value;
    
    const filteredProducts = category === 'all' 
        ? products 
        : products.filter(product => product.category === category);
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <h3 class="product-title">${formatProductName(product.name)}</h3>
                <p class="product-category">${product.category}</p>
                <p class="product-price">₹${product.price.toLocaleString()}</p>
                <div class="product-actions">
                    <button class="add-to-cart" data-id="${product.id}">Add to Cart</button>
                    <button class="view-details">Details</button>
                </div>
            </div>
        `;
        productGrid.appendChild(productCard);
    });
    
    // Add event listeners to the new buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            addToCart(productId);
        });
    });

    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', async (e) => {
            const productId = parseInt(e.target.closest('.product-card').querySelector('.add-to-cart').getAttribute('data-id'));
            const product = await fetchProductById(productId);
            if (product) {
                showFeedback(`${formatProductName(product.name)}: ${product.description} (₹${product.price.toLocaleString()})`);
            } else {
                showFeedback('Product details not found');
            }
        });
    });
}

// Format product name for display
function formatProductName(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Refresh the browser state from the session-scoped backend cart.
async function refreshCart(showError = true) {
    try {
        const data = await apiRequest('/api/cart');
        cart = data.items.map(item => ({
            id: item.product_id,
            itemId: item.id,
            quantity: item.quantity,
            ...item.product,
            line_total: item.line_total
        }));
        cartSummary = data;
        updateCartCount();
        if (cartModal.style.display === 'flex') renderCartItems();
        return data;
    } catch (error) {
        cart = [];
        cartSummary = { total_quantity: 0, subtotal: 0, total: 0 };
        updateCartCount();
        if (showError) showFeedback('Unable to load your cart. Please try again.');
        return null;
    }
}

// Add product to the backend cart.
async function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showFeedback('Product not found');
        return false;
    }

    try {
        await apiRequest('/api/cart/items', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity: 1 })
        });
        await refreshCart(false);
        showFeedback(`${formatProductName(product.name)} added to cart`);
        return true;
    } catch (error) {
        showFeedback('Unable to add this product to your cart.');
        return false;
    }
}

// Decrease a product quantity by one.
async function removeFromCart(productId) {
    const item = cart.find(cartItem => cartItem.id === productId);
    if (!item) {
        showFeedback('That product is not in your cart');
        return;
    }

    try {
        if (item.quantity === 1) {
            await apiRequest(`/api/cart/items/${item.itemId}`, { method: 'DELETE' });
        } else {
            await apiRequest(`/api/cart/items/${item.itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: item.quantity - 1 })
            });
        }
        await refreshCart(false);
        showFeedback(`${formatProductName(item.name)} removed from cart`);
    } catch (error) {
        showFeedback('Unable to update your cart.');
    }
}

// Update cart count display
function updateCartCount() {
    cartCount.textContent = cartSummary.total_quantity;
}

// Show feedback message
function showFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'feedback-message';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(feedback);
        }, 300);
    }, 3000);
}

// Render cart items in modal
function renderCartItems() {
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Your cart is empty</p>';
        cartTotalAmount.textContent = '₹0';
        const quantityElement = document.getElementById('cart-total-quantity');
        if (quantityElement) quantityElement.textContent = '0 items';
        return;
    }
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-title">${formatProductName(item.name)}</h4>
                <p class="cart-item-category">${item.category}</p>
                <p class="cart-item-price">₹${item.price.toLocaleString()}</p>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn increase" data-id="${item.id}">+</button>
                </div>
                <button class="remove-item" data-id="${item.id}">Remove</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    cartTotalAmount.textContent = `₹${cartSummary.subtotal.toLocaleString()}`;
    const quantityElement = document.getElementById('cart-total-quantity');
    if (quantityElement) quantityElement.textContent = `${cartSummary.total_quantity} item${cartSummary.total_quantity === 1 ? '' : 's'}`;
    
    // Add event listeners to quantity buttons
    document.querySelectorAll('.decrease').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            removeFromCart(productId);
        });
    });
    
    document.querySelectorAll('.increase').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            addToCart(productId);
        });
    });
    
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = parseInt(e.target.getAttribute('data-id'));
            removeItemCompletely(productId);
        });
    });
}

// Remove item completely from cart
async function removeItemCompletely(productId) {
    const item = cart.find(cartItem => cartItem.id === productId);
    if (!item) return;
    try {
        await apiRequest(`/api/cart/items/${item.itemId}`, { method: 'DELETE' });
        await refreshCart(false);
        showFeedback(`${formatProductName(item.name)} removed from cart`);
    } catch (error) {
        showFeedback('Unable to remove this product.');
    }
}

// Event listeners
categoryFilter.addEventListener('change', loadProducts);

// Cart icon click
document.querySelector('.cart-icon').addEventListener('click', () => {
    cartModal.style.display = 'flex';
    renderCartItems();
});

document.getElementById('clear-cart-btn').addEventListener('click', async () => {
    if (cart.length === 0) {
        showFeedback('Your cart is empty');
        return;
    }
    try {
        await apiRequest('/api/cart', { method: 'DELETE' });
        await refreshCart(false);
        showFeedback('Your cart has been cleared');
    } catch (error) {
        showFeedback('Unable to clear your cart.');
    }
    refreshCart(false);
});

// Close cart modal
closeCart.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

// Checkout button
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        showFeedback('Your cart is empty');
        return;
    }
    showFeedback('Proceeding to checkout');
    logCommand('Checkout initiated');
});

// Voice shopping button
voiceBtn.addEventListener('click', () => {
    voicePanel.style.display = 'flex';
    voiceStatusText.textContent = 'Click the microphone to start';
});

// Close voice panel
closeVoice.addEventListener('click', () => {
    voicePanel.style.display = 'none';
    stopListening();
});

// Help button
helpBtn.addEventListener('click', () => {
    alert(`Available voice commands:
- Add [product] to cart
- Remove [product] from cart
- What's in my cart?
- Checkout
- List products
- Help`);
});

// Initialize voice recognition
function initVoiceRecognition() {
    try {
        // Check if browser supports speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            voiceBtn.style.display = 'none';
            return;
        }
        
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            isListening = true;
            startListeningBtn.classList.add('listening');
            voiceStatusText.textContent = 'Listening...';
            animateVisualizer();
            logCommand('Voice recognition started');
        };
        
        recognition.onend = () => {
            isListening = false;
            startListeningBtn.classList.remove('listening');
            stopVisualizer();
            
            if (!voicePanel.style.display === 'flex') return;
            
            voiceStatusText.textContent = 'Click the microphone to start';
            
            // Restart listening if panel is still open
            if (voicePanel.style.display === 'flex') {
                setTimeout(() => {
                    if (voicePanel.style.display === 'flex') {
                        startListening();
                    }
                }, 1000);
            }
        };
        
        recognition.onerror = (event) => {
            isListening = false;
            startListeningBtn.classList.remove('listening');
            stopVisualizer();
            
            let errorMessage = 'Error occurred in recognition';
            if (event.error === 'not-allowed') {
                errorMessage = 'Microphone access denied. Please allow microphone access.';
            } else if (event.error === 'no-speech') {
                errorMessage = 'No speech detected';
            }
            
            voiceStatusText.textContent = errorMessage;
            logCommand(`Error: ${errorMessage}`);
        };
        
        recognition.onresult = async (event) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.toLowerCase();
            
            logCommand(`Heard: ${transcript}`);
            await processVoiceCommand(transcript);
        };
        
        // Start/stop listening button
        startListeningBtn.addEventListener('click', () => {
            if (isListening) {
                stopListening();
            } else {
                startListening();
            }
        });
        
    } catch (e) {
        console.error('Voice recognition not supported', e);
        voiceBtn.style.display = 'none';
    }
}

// Start voice recognition
function startListening() {
    if (!recognition) return;
    
    try {
        recognition.start();
    } catch (e) {
        voiceStatusText.textContent = 'Error starting voice recognition';
        logCommand(`Error: ${e.message}`);
    }
}

// Stop voice recognition
function stopListening() {
    if (!recognition) return;
    
    try {
        recognition.stop();
    } catch (e) {
        console.error('Error stopping recognition', e);
    }
}

// Process voice commands
async function processVoiceCommand(command) {
    const normalized = normalizeCommand(command);
    logCommand(`Normalized: ${normalized}`);
    
    // Add to cart
    if (isCommand(normalized, 'add') && isCommand(normalized, 'cart')) {
        const product = extractProduct(normalized);
        await addProductByVoice(product);
    }
    
    // Remove from cart
    else if (isCommand(normalized, 'remove') && isCommand(normalized, 'cart')) {
        const product = extractProduct(normalized);
        await removeProductByVoice(product);
    }
    
    // Check cart
    else if (anyCommandIn(normalized, ["what's in cart", "show cart", "view cart"])) {
        showCartByVoice();
    }
    
    // Checkout
    else if (isCommand(normalized, 'checkout')) {
        checkoutByVoice();
    }
    
    // List products
    else if (anyCommandIn(normalized, ["list products", "what's available"])) {
        listProductsByVoice();
    }
    
    // Help
    else if (isCommand(normalized, 'help')) {
        showHelpByVoice();
    }
    
    else {
        logCommand('Command not recognized');
        speakResponse('Sorry, I didn\'t understand that. Try saying "help" for options.');
    }
}

// Normalize voice command
function normalizeCommand(command) {
    const words = command.split(' ');
    const normalized = [];
    
    for (const word of words) {
        // Check command words
        let matched = false;
        for (const [standard, variations] of Object.entries(commandVariations)) {
            if (variations.includes(word)) {
                normalized.push(standard);
                matched = true;
                break;
            }
        }
        
        // Check product names
        if (!matched) {
            for (const [product, variations] of Object.entries(productSimilarWords)) {
                if (word === product || variations.includes(word)) {
                    normalized.push(product);
                    matched = true;
                    break;
                }
            }
        }
        
        if (!matched) {
            normalized.push(word);
        }
    }
    
    return normalized.join(' ');
}

// Check if command contains target or variations
function isCommand(command, target) {
    if (commandVariations[target]) {
        return commandVariations[target].some(v => command.includes(v)) || command.includes(target);
    }
    return command.includes(target);
}

// Check if any of the commands are in the text
function anyCommandIn(text, commands) {
    return commands.some(cmd => text.includes(cmd));
}

// Extract product name from command
function extractProduct(command) {
    const stopWords = new Set();
    for (const variations of Object.values(commandVariations)) {
        variations.forEach(word => stopWords.add(word));
    }
    stopWords.add('to');
    stopWords.add('the');
    stopWords.add('a');
    stopWords.add('an');
    stopWords.add('my');
    stopWords.add('from');
    stopWords.add('in');
    stopWords.add('and');
    
    return command.split(' ')
        .filter(word => !stopWords.has(word))
        .join(' ');
}

// Add product to cart by voice
async function addProductByVoice(productName) {
    const matchedProduct = await matchProduct(productName);
    
    if (matchedProduct) {
        const added = await addToCart(matchedProduct.id);
        if (added) {
            speakResponse(`Added ${formatProductName(matchedProduct.name)} to your cart`);
        }
    } else {
        const productNames = products.map(p => formatProductName(p.name)).join(', ');
        speakResponse(`Couldn't find ${productName}. Available products are: ${productNames}`);
    }
}

// Remove product from cart by voice
async function removeProductByVoice(productName) {
    const matchedProduct = await matchProduct(productName);
    
    if (matchedProduct) {
        const cartItem = cart.find(item => item.id === matchedProduct.id);
        
        if (cartItem) {
            await removeFromCart(matchedProduct.id);
            speakResponse(`Removed ${formatProductName(matchedProduct.name)} from your cart`);
        } else {
            speakResponse(`${formatProductName(matchedProduct.name)} is not in your cart`);
        }
    } else {
        speakResponse(`Product ${productName} not found`);
    }
}

// Match spoken product name via FastAPI search
async function matchProduct(productName) {
    const results = await searchProducts(productName);
    return results.length > 0 ? results[0] : null;
}

// Show cart contents by voice
async function showCartByVoice() {
    await refreshCart(false);
    if (cart.length === 0) {
        speakResponse('Your cart is empty');
        return;
    }
    
    let itemsList = '';
    cart.forEach(item => {
        itemsList += `${item.quantity} ${formatProductName(item.name)}, `;
    });
    
    itemsList = itemsList.slice(0, -2); // Remove trailing comma
    speakResponse(`Your cart has: ${itemsList}. Total is ₹${cartSummary.total.toLocaleString()}`);
}

// Checkout by voice
async function checkoutByVoice() {
    await refreshCart(false);
    if (cart.length === 0) {
        speakResponse('Cannot checkout - your cart is empty');
        return;
    }
    const subtotal = cartSummary.subtotal;
    
    const tax = subtotal * 0.18; // 18% tax
    const total = subtotal + tax;
    
    // Update payment portal with cart totals
    document.getElementById('payment-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
    document.getElementById('payment-tax').textContent = `₹${tax.toLocaleString()}`;
    document.getElementById('payment-total').textContent = `₹${total.toLocaleString()}`;
    
    // Speak confirmation
    speakResponse(`Your total is ₹${total.toLocaleString()}. Opening payment portal`);
    logCommand('Checkout initiated by voice');
    
    // Open payment modal
    document.getElementById('payment-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Close cart modal if open
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
}

// List products by voice
function listProductsByVoice() {
    const productNames = products.map(p => formatProductName(p.name)).join(', ');
    speakResponse(`We offer: ${productNames}`);
}

// Show help by voice
function showHelpByVoice() {
    speakResponse('Here are the available commands: Add product to cart, remove product from cart, what\'s in my cart, checkout, list products');
}

// Speak response to user
function speakResponse(text) {
    // In a real app, you would use the Web Speech API's SpeechSynthesis
    // For this demo, we'll just log it and show a message
    
    logCommand(`Response: ${text}`);
    showFeedback(text);
    
    // Uncomment to enable actual speech (may not work in all browsers)
    /*
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
    */
}

// Log command to the console
function logCommand(message) {
    const time = new Date().toLocaleTimeString();
    const logEntry = document.createElement('p');
    logEntry.innerHTML = `<span class="time">${time}</span> - ${message}`;
    commandLog.appendChild(logEntry);
    commandLog.scrollTop = commandLog.scrollHeight;
}

// Animate voice visualizer
function animateVisualizer() {
    if (!isListening) return;
    
    for (let i = 0; i < visualizerBars.length; i++) {
        const height = Math.random() * 80 + 20;
        visualizerBars[i].style.height = `${height}%`;
    }
    
    setTimeout(animateVisualizer, 100);
}
function animateOnScroll() {
    const elements = document.querySelectorAll('.promo-card, .category-card, .offer-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Smooth scrolling for navigation
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}

// Initialize animations
document.addEventListener('DOMContentLoaded', () => {
    animateOnScroll();
    setupSmoothScrolling();
    
    // Add hover effect to shop now buttons
    const shopButtons = document.querySelectorAll('.shop-now-btn');
    shopButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px) scale(1.05)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(44, 62, 80, 0.95)';
        header.style.padding = '15px 0';
    } else {
        header.style.background = 'var(--primary-color)';
        header.style.padding = '20px 0';
    }
});
// Stop visualizer animation
function stopVisualizer() {
    for (const bar of visualizerBars) {
        bar.style.height = '20%';
    }
}
function openPaymentPortal() {
    // First check if cart is empty
    if (cart.length === 0) {
        showFeedback('Your cart is empty');
        return;
    }
    
    // Calculate total amount
    const total = cartSummary.total;
    
    // Update payment portal with cart total
    document.getElementById('payment-subtotal').textContent = `₹${total.toLocaleString()}`;
    document.getElementById('payment-total').textContent = `₹${total.toLocaleString()}`;
    
    // Show payment modal
    document.getElementById('payment-modal').style.display = 'flex';
    
    // Optional: Close cart modal if open
    document.getElementById('cart-modal').style.display = 'none';
}
// Close payment modal
// Payment Portal Functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const paymentModal = document.getElementById('payment-modal');
    const closePayment = document.getElementById('close-payment');
    const payNowBtn = document.getElementById('pay-now-btn');
    const successModal = document.getElementById('success-modal');
    const continueBtn = document.getElementById('continue-shopping');
    const viewOrderBtn = document.getElementById('view-order');
    const paymentMethods = document.querySelectorAll('.method');
    const paymentForms = document.querySelectorAll('.payment-form');
    
    // Format card number input (keeps the formatting but won't validate)
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s+/g, '');
            if (value.length > 0) {
                value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
            }
            e.target.value = value;
        });
    }
    
    // Format expiry date input (keeps the formatting but won't validate)
    const expiryDateInput = document.getElementById('expiry-date');
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Show payment modal when checkout is clicked
    document.getElementById('checkout-btn')?.addEventListener('click', function() {
        // Calculate and display totals
        const subtotal = cartSummary.subtotal;
        
        const tax = subtotal * 0.02; // 2% tax
        const total = subtotal + tax;
        
        document.getElementById('payment-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
        document.getElementById('payment-tax').textContent = `₹${tax.toLocaleString()}`;
        document.getElementById('payment-total').textContent = `₹${total.toLocaleString()}`;
        
        paymentModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    });
    
    // Close payment modal
    closePayment?.addEventListener('click', function() {
        paymentModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    // Payment method selection
    paymentMethods.forEach(method => {
        method.addEventListener('click', function() {
            // Remove active class from all methods
            paymentMethods.forEach(m => m.classList.remove('active'));
            // Add active class to clicked method
            this.classList.add('active');
            
            // Hide all forms
            paymentForms.forEach(form => form.classList.add('hidden'));
            // Show selected form
            const methodType = this.getAttribute('data-method');
            document.getElementById(`${methodType}-form`).classList.remove('hidden');
        });
    });
    
    // Process payment - modified to always show success
    payNowBtn?.addEventListener('click', function() {
        // Show loading state
        payNowBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment';
        payNowBtn.disabled = true;
        
        // Simulate payment processing (no validation)
        setTimeout(() => {
            // Hide payment modal and show success
            paymentModal.style.display = 'none';
            
            // Set success details
            const total = document.getElementById('payment-total').textContent;
            document.getElementById('amount-paid').textContent = total;
            
            // Get payment method name
            const paymentMethod = document.querySelector('.method.active span').textContent;
            document.getElementById('payment-method').textContent = paymentMethod;
            
            // Generate random order ID
            const orderId = 'VC-' + Math.floor(100000 + Math.random() * 900000);
            document.getElementById('order-id').textContent = orderId;
            
            // Calculate delivery date (3-5 days from now)
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 3 + Math.floor(Math.random() * 3));
            document.getElementById('delivery-date').textContent = deliveryDate.toDateString();
            
            // Show success modal
            successModal.style.display = 'flex';
            
            // Reset pay now button
            payNowBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Securely';
            payNowBtn.disabled = false;
            
            clearCartAfterPayment();
        }, 1500); // 1.5 second delay to simulate processing
    });

    async function clearCartAfterPayment() {
        try {
            await apiRequest('/api/cart', { method: 'DELETE' });
            await refreshCart(false);
        } catch (error) {
            showFeedback('Payment completed, but the cart could not be cleared.');
        }
    }
    
    // Continue shopping
    continueBtn?.addEventListener('click', function() {
        successModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
    
    // View order details
    viewOrderBtn?.addEventListener('click', function() {
        // In a real app, this would redirect to order details page
        alert('Order details would be shown here');
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === paymentModal) {
            paymentModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (event.target === successModal) {
            successModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
});
