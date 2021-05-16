import { createContext, ReactNode, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });
  
  // prepara referência
  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    
    // adiciona a referência do estado
    prevCartRef.current = cart;
  });

  // pega o valor do cart
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {

    // se alterado
    if(cartPreviousValue !== cart){

      // atualiza no localstorage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));

    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
 
    try {

      // pega referência do estado
      const updatedCart = [...cart];

      // verifica se está no carrinho
      let itemCart = updatedCart.find((product) => product.id === productId);
      
      // prepara total
      let amountCart = itemCart ? itemCart.amount : 0;
      
      // soma ao total
      amountCart++;

      // consulta total disponível em estoque
      const stock = await api.get(`/stock/${productId}`);

      // verifica se o total de itens ultrapassa a quantidade em estoque
      if(amountCart > stock.data.amount){

        // limite no estoque indisponível
        toast.error('Quantidade solicitada fora de estoque');
      
        // retorna aqui
        return;
      }

      // altera no cart
      if(itemCart){

        // altera o amount
        itemCart.amount = amountCart;

      }else{
        // adiciona o produto ao carrinho
          
        // consulta dados do produto
        const responseProduct = await api.get(`/products/${productId}`);

        // pega dados do produto
        const product = responseProduct.data;

        // adiciona ao carrinho
        updatedCart.push({
          ...product,
          amount: 1
        });

      }

      // atualiza
      setCart(updatedCart);

      // // atualiza no localstorage
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      // erro
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      
      // encontra no carrinho
      const cartProduct = cart.find((product) => product.id === productId);

      // se não encontrado, retorna
      if(!cartProduct){
        throw Error();
      }

      const updatedCart = cart.filter((product) => product.id !== productId);

      // remove
      setCart(updatedCart);

      // // atualiza no localstorage
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {

    try {
        
      // verifica se está passando do total em estoque
      if(amount <= 0){
        return;
      }

      // consulta total disponível em estoque
      const { data } = await api.get(`/stock/${productId}`);

      // verifica se está passando do total em estoque
      if(amount > data.amount){

        // informa o erro
        toast.error('Quantidade solicitada fora de estoque');
        
        // para execução
        return;

      }

      // encontra no carrinho
      const cartProduct = cart.find((product) => product.id === productId);

      // se não encontrado, retorna
      if(!cartProduct){
       throw Error();
      }

      // prepara o array
      const updatedCart = cart.map((product) => {
        return product.id === productId ? {
          ...product,
          amount
        } : product
      });

      // altera total do item no carrinho
      setCart(updatedCart);

      // // atualiza no localstorage
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
