export interface CartItem {
  product: {
    id?: string;
    barcode: string;
    name: string;
    price: number;
    stock: number;
  };
  quantity: number;
}

export interface Cart {
  sessionId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export const cartService = {
  getCart: (): CartItem[] => {
    if (typeof window === "undefined") return [];
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : [];
  },

  addToCart: (product: CartItem["product"], quantity: number = 1): void => {
    if (typeof window === "undefined") return;
    const cart = cartService.getCart();
    const existingItem = cart.find(
      (item) => item.product.barcode === product.barcode
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
  },

  removeFromCart: (barcode: string): void => {
    if (typeof window === "undefined") return;
    const cart = cartService.getCart();
    const updatedCart = cart.filter((item) => item.product.barcode !== barcode);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
  },

  updateQuantity: (barcode: string, quantity: number): void => {
    if (typeof window === "undefined") return;
    const cart = cartService.getCart();
    const item = cart.find((item) => item.product.barcode === barcode);
    if (item) {
      item.quantity = quantity;
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  },

  clearCart: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("cart");
  },

  getCartTotal: (): number => {
    const cart = cartService.getCart();
    return cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  },
};
