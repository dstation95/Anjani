/*
 *
 * OrderSuccess
 *
 */

import React from 'react';

import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { clearCart, getCartId } from '../Cart/actions';
import actions from '../../actions';
import axios from 'axios';

import NotFound from '../../components/Common/NotFound';
import LoadingIndicator from '../../components/Common/LoadingIndicator';

class OrderSuccess extends React.PureComponent {

   async componentDidMount(dispatch, getState) {
    const id = this.props.match.params.id;
    // this.props.fetchOrder(id )
    
    
    // this.props.fetchOrder(id)
    // const cartId = localStorage.getItem('cart_id');
    // const total = getState().cart.cartTotal;
    // const orderInfo =  await axios.get(`/api/order/success/${id}`)
    // // const orderInfo = await axios.get(`/api/order/success/${id}`)
    // console.log(orderInfo)
    // const response =  await axios.post(`/api/order/add`, {
    //       cartId,
    //       total
    //     });
    // newId = this.function2(id)
    this.props.confrimOrder(id)
  }

  // function2 = async(id, dispatch, getState) => {
  //   const cartId = localStorage.getItem('cart_id');
  //   const total = getState().cart.cartTotal;
  //   const orderInfo =  await axios.get(`/api/order/success/${id}`)
  //   // const orderInfo = await axios.get(`/api/order/success/${id}`)
  //   console.log(orderInfo)
  //   const response =  await axios.post(`/api/order/add`, {
  //         cartId,
  //         total
  //       });
  //   console.log(response)
  //   this.props.fetchOrder(response.data.order._id)
  //       return response.data.order._id
  // }

  // async componentDidMount() {
  //   // throw new Error("123");
  //   const id = this.props.match.params.id;
  //   const orderInfo = await axios.get(`/api/order/success/${id}`)
  //   // throw new Error(orderInfo.session.payment_status);
  //   console.log("1", orderInfo.session.payment_status)
  //   if (orderInfo.session.payment_status == 'paid'){}
  //   const cartId = localStorage.getItem('cart_id');
  //   const total = getState().cart.cartTotal;
  //   if (cartId) {
  //       const response = await axios.post(`/api/order/add`, {
  //         cartId,
  //         total
  //       });
  //     }
  //   console.log("repsonse order", response.data.order._id);
  //   this.props.fetchOrder(response.data.order._id);
    

  componentDidUpdate(prevProps) {
    if (this.props.match.params.id !== prevProps.match.params.id) {
      const id = this.props.match.params.id;
      this.props.confrimOrder(id);
    }
  }

  render() {
    const { order, isLoading } = this.props;
    // console.log(order);

    return (
      <div className='order-success'>
        {isLoading ? (
          <LoadingIndicator />
        ) : order._id ? (
          <div className='order-message'>
            <h2>Thank you for your order.</h2>
            <p>
              Order{' '}
              <Link
                to={{
                  pathname: `/order/${order._id}?success`,
                  state: { prevPath: location.pathname }
                }}
                // to={`/order/${order._id}?success`}
                className='order-label'
              >
                #{order._id}
              </Link>{' '}
              is complete.
            </p>
            <p>A confirmation email will be sent to you shortly.</p>
            <div className='order-success-actions'>
              <Link to='/dashboard/orders' className='btn-link'>
                Manage Orders
              </Link>
              <Link to='/shop' className='btn-link shopping-btn'>
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <NotFound message='No order found.' />
        )}
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    order: state.order.order,
    isLoading: state.order.isLoading
  };
};

export default connect(mapStateToProps, actions)(OrderSuccess);
