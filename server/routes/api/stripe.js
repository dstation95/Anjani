const stripe = require('stripe')('sk_test_51NkttxKiD5Z5hRRAy6joDPYMQ2X1fpeDDgY6QYjXQtjemLjyidghojsgJ82trE18LoTKFHWMmJz0OwgzQ5NUOJNi00QweRAGDR');
const express = require('express');

const YOUR_DOMAIN = 'http://localhost:8080';
const router = express.Router();
const Mongoose = require('mongoose');

// Bring in Models & Utils
const Order = require('../../models/order');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const auth = require('../../middleware/auth');
const mailgun = require('../../services/mailgun');
const store = require('../../utils/store');
const { ROLES, CART_ITEM_STATUS } = require('../../constants');

router.post('/add', auth, async (req, res) => {
  try {
    const cart = req.body.cartId;
    const total = req.body.total;
    const user = req.user._id;

    const order = new Order({
      cart,
      user,
      total
    });

    const orderDoc = await order.save();
    const cartDoc1 = await Cart.findById(orderDoc.cart._id);
    console.log(cartDoc1);
    console.log("total", total)
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: total,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${YOUR_DOMAIN}/success.html`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
    });
    console.log(session);
    
    const cartDoc = await Cart.findById(orderDoc.cart._id).populate({
      path: 'products.product',
      populate: {
        path: 'brand'
      }
    });

    const newOrder = {
      _id: orderDoc._id,
      created: orderDoc.created,
      user: orderDoc.user,
      total: orderDoc.total,
      products: cartDoc.products
    };

    await mailgun.sendEmail(order.user.email, 'order-confirmation', newOrder);

    res.status(200).json({
      success: true,
      message: `Your order has been placed successfully!`,
      order: { _id: orderDoc._id }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.post('/create-checkout-session', auth,  async (req, res) => {

  product_line = [];
  const cart = req.body.cartId;
  const total = req.body.total;
  // const user = req.user._id;

  const cartDoc1 = await Cart.findById(orderDoc.cart._id);

  productsNum = cartDoc1.products.length;

  for(product in cartDoc1.products ) {
    const foundProduct = await Product.findOne(product._id);
    product_line.push({price: foundProduct.stripe_id, quantity: product.quantity})
  }

  const session = await stripe.checkout.sessions.create({
    line_items: product_line,
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}/success.html`,
    cancel_url: `${YOUR_DOMAIN}/cancel.html`,
  });

  res.redirect(303, session.url);
});