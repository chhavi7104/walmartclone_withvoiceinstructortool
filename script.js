// Product data (would normally come from an API)
const products = [
    {
        id: 1,
        name: "smartphone pro",
        price: 89900,
        category: "tech",
        description: "Premium smartphone with advanced features",
        image: "assets/products/smartphone.png"
    },
    {
        id: 2,
        name: "luxury laptop",
        price: 149900,
        category: "tech",
        description: "Ultra-thin laptop with high performance",
        image: "assets/products/laptop.png"
    },
    {
        id: 3,
        name: "noise-canceling headphones",
        price: 28900,
        category: "tech",
        description: "Premium noise-canceling headphones",
        image: "assets/products/headphone.png"
    },
    {
        id: 4,
        name: "premium whiskey",
        price: 12500,
        category: "luxury",
        description: "Aged premium whiskey",
        image: "assets/products/whiskey.png"
    },
    {
        id: 5,
        name: "imported champagne",
        price: 8500,
        category: "luxury",
        description: "Finest imported champagne",
        image: "assets/products/Champagne.png"
    },
    {
        id: 6,
        name: "designer handbag",
        price: 75900,
        category: "luxury",
        description: "Luxury designer handbag",
        image: "assets/products/handbag.png"
    },
    {
        id: 7,
        name: "organic matcha set",
        price: 2500,
        category: "lifestyle",
        description: "Premium organic matcha tea set",
        image: "assets/products/matcha.webp"
    },
    {
        id: 8,
        name: "artisan coffee beans",
        price: 1800,
        category: "lifestyle",
        description: "Specialty artisan coffee beans",
        image: "assets/products/coffee.png"
    }
];

// Shopping cart
let cart = [];

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
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartCount();
    
    // Load cart from localStorage if available
    const savedCart = localStorage.getItem('luxeCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
    
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
}

// Format product name for display
function formatProductName(name) {
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: 1,
            category: product.category
        });
    }
    
    updateCartCount();
    saveCart();
    showFeedback(`${formatProductName(product.name)} added to cart`);
}

// Remove product from cart
function removeFromCart(productId) {
    const productIndex = cart.findIndex(item => item.id === productId);
    
    if (productIndex !== -1) {
        const product = cart[productIndex];
        
        if (product.quantity > 1) {
            product.quantity -= 1;
        } else {
            cart.splice(productIndex, 1);
        }
        
        updateCartCount();
        saveCart();
        showFeedback(`${formatProductName(product.name)} removed from cart`);
        
        if (cartModal.style.display === 'flex') {
            renderCartItems();
        }
    }
}

// Update cart count display
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('luxeCart', JSON.stringify(cart));
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
        return;
    }
    
    let total = 0;
    
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (!product) return;
        
        total += product.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-title">${formatProductName(product.name)}</h4>
                <p class="cart-item-category">${product.category}</p>
                <p class="cart-item-price">₹${product.price.toLocaleString()}</p>
                <div class="cart-item-quantity">
                    <button class="quantity-btn decrease" data-id="${product.id}">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn increase" data-id="${product.id}">+</button>
                </div>
                <button class="remove-item" data-id="${product.id}">Remove</button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    cartTotalAmount.textContent = `₹${total.toLocaleString()}`;
    
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
function removeItemCompletely(productId) {
    const productIndex = cart.findIndex(item => item.id === productId);
    
    if (productIndex !== -1) {
        const product = cart[productIndex];
        cart.splice(productIndex, 1);
        
        updateCartCount();
        saveCart();
        showFeedback(`${formatProductName(product.name)} removed from cart`);
        
        if (cartModal.style.display === 'flex') {
            renderCartItems();
        }
    }
}

// Event listeners
categoryFilter.addEventListener('change', loadProducts);

// Cart icon click
document.querySelector('.cart-icon').addEventListener('click', () => {
    cartModal.style.display = 'flex';
    renderCartItems();
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
    
    // In a real app, this would redirect to checkout page
    showFeedback('Proceeding to checkout');
    logCommand('Checkout initiated');
    
    // Clear cart after checkout
    setTimeout(() => {
        cart = [];
        updateCartCount();
        saveCart();
        renderCartItems();
        cartModal.style.display = 'none';
    }, 2000);
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
        
        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript.toLowerCase();
            
            logCommand(`Heard: ${transcript}`);
            processVoiceCommand(transcript);
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
function processVoiceCommand(command) {
    const normalized = normalizeCommand(command);
    logCommand(`Normalized: ${normalized}`);
    
    // Add to cart
    if (isCommand(normalized, 'add') && isCommand(normalized, 'cart')) {
        const product = extractProduct(normalized);
        addProductByVoice(product);
    }
    
    // Remove from cart
    else if (isCommand(normalized, 'remove') && isCommand(normalized, 'cart')) {
        const product = extractProduct(normalized);
        removeProductByVoice(product);
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
function addProductByVoice(productName) {
    const matchedProduct = matchProduct(productName);
    
    if (matchedProduct) {
        addToCart(matchedProduct.id);
        speakResponse(`Added ${formatProductName(matchedProduct.name)} to your cart`);
    } else {
        const productNames = products.map(p => formatProductName(p.name)).join(', ');
        speakResponse(`Couldn't find ${productName}. Available products are: ${productNames}`);
    }
}

// Remove product from cart by voice
function removeProductByVoice(productName) {
    const matchedProduct = matchProduct(productName);
    
    if (matchedProduct) {
        const cartItem = cart.find(item => item.id === matchedProduct.id);
        
        if (cartItem) {
            removeFromCart(matchedProduct.id);
            speakResponse(`Removed ${formatProductName(matchedProduct.name)} from your cart`);
        } else {
            speakResponse(`${formatProductName(matchedProduct.name)} is not in your cart`);
        }
    } else {
        speakResponse(`Product ${productName} not found`);
    }
}

// Match spoken product name to actual product
function matchProduct(productName) {
    // 1. Direct match
    const directMatch = products.find(p => p.name === productName);
    if (directMatch) return directMatch;
    
    // 2. Check similar names
    for (const product of products) {
        if (productSimilarWords[product.name] && productSimilarWords[product.name].includes(productName)) {
            return product;
        }
    }
    
    // 3. Phonetic similarity
    for (const product of products) {
        const productWords = product.name.split(' ');
        if (productWords.some(word => word.startsWith(productName) || 
            productWords.some(word => productName.startsWith(word)))) {
            return product;
        }
    }
    
    // 4. Partial match
    for (const product of products) {
        if (product.name.includes(productName) || productName.includes(product.name)) {
            return product;
        }
    }
    
    return null;
}

// Show cart contents by voice
function showCartByVoice() {
    if (cart.length === 0) {
        speakResponse('Your cart is empty');
        return;
    }
    
    let itemsList = '';
    let total = 0;
    
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            itemsList += `${item.quantity} ${formatProductName(product.name)}, `;
            total += product.price * item.quantity;
        }
    });
    
    itemsList = itemsList.slice(0, -2); // Remove trailing comma
    speakResponse(`Your cart has: ${itemsList}. Total is ₹${total.toLocaleString()}`);
}

// Checkout by voice
function checkoutByVoice() {
    if (cart.length === 0) {
        speakResponse('Cannot checkout - your cart is empty');
        return;
    }
    
    const total = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    
    speakResponse(`Your total is ₹${total.toLocaleString()}. Proceeding to checkout`);
    logCommand('Checkout initiated by voice');
    
    // Clear cart after checkout
    setTimeout(() => {
        cart = [];
        updateCartCount();
        saveCart();
    }, 2000);
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

// Stop visualizer animation
function stopVisualizer() {
    for (const bar of visualizerBars) {
        bar.style.height = '20%';
    }
}