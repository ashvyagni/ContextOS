import { useState, useEffect } from 'react';

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
};

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    fetch('/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  }, []);

  const addToCart = (product: Product) => {
    setCart([...cart, product]);

    fetch('/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: product.id,
        name: product.name,
        price: product.price
      })
    })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((err) => console.error(err));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const handleCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const processPayment = () => {
    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-mono selection:bg-orange-500 selection:text-white flex flex-col relative z-0">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000015_1px,transparent_1px),linear-gradient(to_bottom,#00000015_1px,transparent_1px)] bg-[size:32px_32px] -z-10"></div>

      <div className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-1.5 px-8 flex justify-between items-center">
        <span>SYS.STATUS: ONLINE // PORT: 5173</span>
        <span className="flex items-center gap-2 text-orange-500 font-bold">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
          LIVE FEED
        </span>
      </div>

      <header className="px-8 py-8 flex justify-between items-end sticky top-0 bg-[#f4f4f0]/90 z-10 border-b-2 border-black">
        <div>
          <h1 className="text-4xl font-black tracking-tighter hover:text-orange-600 transition-colors cursor-crosshair">
            GraviComm //
          </h1>
          <p className="text-xs text-gray-600 mt-1 font-bold tracking-widest">
            Advanced Hardware Provisioning
          </p>
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="text-sm font-black border-2 border-black px-6 py-3 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] hover:bg-orange-500 hover:text-white transition-all cursor-pointer relative z-20"
        >
          Cart [{cart.length}]
        </button>
      </header>

      <main className="p-8 max-w-7xl mx-auto mt-8 w-full flex-grow relative z-0">
        {products.length === 0 ? (
          <div className="w-full flex justify-center py-32 border-2 border-dashed border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
            <p className="text-sm font-bold animate-pulse tracking-widest">
              Awaiting Host Payload...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {products.map((product) => (
              <div key={product.id} className="group flex flex-col border-2 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(249,115,22,1)] hover:-translate-y-2 transition-all duration-300">
                <div className="w-full aspect-square border-2 border-black bg-[#f4f4f0] flex flex-col items-center justify-center mb-6 relative overflow-hidden group-hover:border-orange-500 transition-colors">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  <div className="absolute top-2 left-2 text-[10px] text-white bg-black px-2 py-0.5 font-bold z-10 border border-black">SYS_IMG</div>
                  <div className="absolute bottom-2 right-2 text-[10px] text-white bg-black px-2 py-0.5 font-bold z-10 border border-black">ID_0{product.id}</div>
                </div>
                <div className="flex-grow border-b-2 border-black pb-4 mb-5">
                  <h2 className="text-xl font-black leading-tight group-hover:text-orange-600 transition-colors">{product.name}</h2>
                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">{product.description}</p>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-black tracking-tighter">${product.price.toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="text-xs font-black bg-black text-white px-6 py-3 border-2 border-black hover:bg-orange-500 hover:text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
                  >
                    [+ Add to Cart]
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t-2 border-black p-8 text-center mt-12 bg-white relative z-0">
        <p className="text-[10px] text-black font-black tracking-[0.2em]">
          © 2026 DevJams // Architecture Strictly Enforced.
        </p>
      </footer>

      {isCartOpen && (
        <div 
          className="fixed inset-0 z-40 flex justify-end bg-black/60"
          onClick={() => setIsCartOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white border-l-4 border-black h-full flex flex-col shadow-[-12px_0px_0px_0px_rgba(249,115,22,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-4 border-black flex justify-between items-center bg-[#f4f4f0]">
              <h2 className="text-2xl font-black tracking-tighter">SYS.CART //</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-xl font-black border-2 border-black w-10 h-10 flex items-center justify-center hover:bg-orange-500 hover:text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                X
              </button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto bg-[linear-gradient(to_right,#00000010_1px,transparent_1px),linear-gradient(to_bottom,#00000010_1px,transparent_1px)] bg-[size:16px_16px]">
              {cart.length === 0 ? (
                <p className="text-xs font-bold text-gray-500 mt-10 text-center tracking-widest bg-white border-2 border-black p-4">
                  [ Memory Buffer Empty ]
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="border-2 border-black bg-white p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:border-orange-500 transition-colors">
                      <div>
                        <p className="text-sm font-black truncate max-w-[220px]">{item.name}</p>
                        <p className="text-xs text-orange-600 font-black mt-1 tracking-tighter">${item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t-4 border-black bg-white">
              <div className="flex justify-between items-end mb-6">
                <span className="text-sm font-black text-gray-500">Payload Total:</span>
                <span className="text-4xl font-black tracking-tighter">${cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-black text-white py-4 font-black text-sm border-2 border-black hover:bg-orange-500 hover:text-black hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white disabled:hover:shadow-none disabled:active:translate-y-0 disabled:active:translate-x-0"
              >
                [ Initialize Checkout ]
              </button>
            </div>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsCheckoutOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(249,115,22,1)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b-4 border-black flex justify-between items-center bg-[#f4f4f0]">
              <h2 className="text-2xl font-black tracking-tighter">SYS.AUTHORIZE //</h2>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-xl font-black border-2 border-black w-10 h-10 flex items-center justify-center hover:bg-orange-500 hover:text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                X
              </button>
            </div>
            
            <div className="p-8 flex flex-col gap-6">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Operator Identification</label>
                <input type="text" placeholder="e.g., v.malhotra" className="w-full border-2 border-black p-4 font-mono text-sm focus:outline-none focus:border-orange-500 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#f4f4f0]" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Deployment Node</label>
                <input type="text" placeholder="e.g., VIT Local Node" className="w-full border-2 border-black p-4 font-mono text-sm focus:outline-none focus:border-orange-500 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#f4f4f0]" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2">Authorization Key</label>
                <input type="password" placeholder="••••••••••••" className="w-full border-2 border-black p-4 font-mono text-sm focus:outline-none focus:border-orange-500 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#f4f4f0]" />
              </div>
            </div>

            <div className="p-6 border-t-4 border-black bg-[#f4f4f0] flex justify-between items-center">
              <span className="text-3xl font-black tracking-tighter">${cartTotal.toFixed(2)}</span>
              <button 
                onClick={processPayment}
                className="bg-black text-white px-8 py-4 font-black text-sm border-2 border-black hover:bg-orange-500 hover:text-black hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:translate-x-2 active:shadow-none transition-all"
              >
                [ Deploy Payload ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;