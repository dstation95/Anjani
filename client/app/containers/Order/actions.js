/*
 *
 * Order actions
 *
 */

import { push } from 'connected-react-router';
import axios from 'axios';
import { success } from 'react-notification-system-redux';

import {
  FETCH_ORDERS,
  FETCH_SEARCHED_ORDERS,
  FETCH_ORDER,
  UPDATE_ORDER_STATUS,
  SET_ORDERS_LOADING,
  SET_ADVANCED_FILTERS,
  CLEAR_ORDERS
} from './constants';

import { clearCart, getCartId } from '../Cart/actions';
import { toggleCart } from '../Navigation/actions';
import handleError from '../../utils/error';

export const updateOrderStatus = value => {
  return {
    type: UPDATE_ORDER_STATUS,
    payload: value
  };
};

export const setOrderLoading = value => {
  return {
    type: SET_ORDERS_LOADING,
    payload: value
  };
};

export const fetchOrders = (page = 1) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.get(`/api/order`, {
        params: {
          page: page ?? 1,
          limit: 20
        }
      });

      const { orders, totalPages, currentPage, count } = response.data;

      dispatch({
        type: FETCH_ORDERS,
        payload: orders
      });

      dispatch({
        type: SET_ADVANCED_FILTERS,
        payload: { totalPages, currentPage, count }
      });
    } catch (error) {
      dispatch(clearOrders());
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

export const fetchAccountOrders = (page = 1) => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.get(`/api/order/me`, {
        params: {
          page: page ?? 1,
          limit: 20
        }
      });

      const { orders, totalPages, currentPage, count } = response.data;

      dispatch({
        type: FETCH_ORDERS,
        payload: orders
      });

      dispatch({
        type: SET_ADVANCED_FILTERS,
        payload: { totalPages, currentPage, count }
      });
    } catch (error) {
      dispatch(clearOrders());
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

export const searchOrders = filter => {
  return async (dispatch, getState) => {
    try {
      dispatch(setOrderLoading(true));

      const response = await axios.get(`/api/order/search`, {
        params: {
          search: filter.value
        }
      });

      dispatch({
        type: FETCH_SEARCHED_ORDERS,
        payload: response.data.orders
      });
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      dispatch(setOrderLoading(false));
    }
  };
};

export const fetchOrder = (id, withLoading = true) => {
  return async (dispatch, getState) => {
    try {
      if (withLoading) {
        dispatch(setOrderLoading(true));
      }

      const response = await axios.get(`/api/order/${id}`);

      dispatch({
        type: FETCH_ORDER,
        payload: response.data.order
      });
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      if (withLoading) {
        dispatch(setOrderLoading(false));
      }
    }
  };
};

export const confrimOrder = (id, withLoading = true) => {
  return async (dispatch, getState) => {
    try {
      if (withLoading) {
        dispatch(setOrderLoading(true));
      }
          const orderInfo =  await axios.get(`/api/order/success/${id}`)
          console.log('ORDERINFO', orderInfo);
        const cartId = localStorage.getItem('cart_id');
    const total = getState().cart.cartTotal;
    const address = orderInfo.data.session.shipping_details.address;
    const sessionTrue = orderInfo.data.success;
    // const orderInfo = await axios.get(`/api/order/success/${id}`)
    console.log(orderInfo)
    const response =  await axios.post(`/api/order/add`, {
          cartId,
          total,
          address,
          sessionTrue,
        }); 
        dispatch(clearCart())
      // const response = await axios.get(`/api/order/${id}`);c
        // throw new Error(response.data.order._id)
      dispatch({
        type: FETCH_ORDER,
        payload: response.data.order
      });
    } catch (error) {
      handleError(error, dispatch);
    } finally {
      if (withLoading) {
        dispatch(setOrderLoading(false));
      }
    }
  };
};

export const cancelOrder = () => {
  return async (dispatch, getState) => {
    try {
      const order = getState().order.order;

      await axios.delete(`/api/order/cancel/${order._id}`);

      dispatch(push(`/dashboard/orders`));
    } catch (error) {
      handleError(error, dispatch);
    }
  };
};

export const updateOrderItemStatus = (itemId, status) => {
  return async (dispatch, getState) => {
    try {
      const order = getState().order.order;

      const response = await axios.put(`/api/order/status/item/${itemId}`, {
        orderId: order._id,
        cartId: order.cartId,
        status
      });

      if (response.data.orderCancelled) {
        dispatch(push(`/dashboard/orders`));
      } else {
        dispatch(updateOrderStatus({ itemId, status }));
        dispatch(fetchOrder(order._id, false));
      }

      const successfulOptions = {
        title: `${response.data.message}`,
        position: 'tr',
        autoDismiss: 1
      };

      dispatch(success(successfulOptions));
    } catch (error) {
      handleError(error, dispatch);
    }
  };
};

export const addOrder = () => {
  return async (dispatch, getState) => {
    try {
      dispatch(getCartId());  
      const cartId = localStorage.getItem('cart_id');
      const total = getState().cart.cartTotal;

      
      
      const response2 = await axios.post(`/api/order/create-checkout-session`, {
        cartId,
        total
  });
  // throw new Error(JSON.stringify(response2.data.session))
  // const parsed = JSON.parse(response2)
  const url1 = JSON.stringify(response2.data.session);
  
  // throw new Error(url)
  const url = url1.slice(1,-1)
  // window.location.href(url)
  window.location.replace(url);

  // useEffect(() => {
  //   window.location.href = url;
  // }, []);
  // window.open(url)
    // window.location.replace(url);

      // if (cartId) {
      //   const response = await axios.post(`/api/order/add`, {
      //     cartId,
      //     total
      //   });

      //   dispatch(push(`/order/success/${response.data.order._id}`));
      //   dispatch(clearCart());
      // }
    } catch (error) {
      handleError(error, dispatch);
    }
  };
};

export const placeOrder = () => {
  return async (dispatch, getState) => {
    const token = localStorage.getItem('token');

    const cartItems = getState().cart.cartItems;

    const cartId = localStorage.getItem('cart_id');
    const total = getState().cart.cartTotal;

  //     const response = await axios.post(`/api/order/create-checkout-session`, {
  //       cartId,
  //       total
  // });

    if (token && cartItems.length > 0) {
      Promise.all([dispatch(getCartId())]).then(() => {
        dispatch(addOrder());
      });
    }

    dispatch(toggleCart());
  };
};

export const clearOrders = () => {
  return {
    type: CLEAR_ORDERS
  };
};
