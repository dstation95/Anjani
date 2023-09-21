const express = require('express');
const stripe = require('stripe')('sk_test_51NkttxKiD5Z5hRRAy6joDPYMQ2X1fpeDDgY6QYjXQtjemLjyidghojsgJ82trE18LoTKFHWMmJz0OwgzQ5NUOJNi00QweRAGDR');
const router = express.Router();
const Mongoose = require('mongoose');

const YOUR_DOMAIN = 'http://localhost:8080';

// Bring in Models & Utils
const Order = require('../../models/order');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const auth = require('../../middleware/auth');
const mailgun = require('../../services/mailgun');
const store = require('../../utils/store');
const { s3Upload, getObjectSignedUrl } = require('../../utils/storage');
const { ROLES, CART_ITEM_STATUS } = require('../../constants');
const order = require('../../models/order');
const { session } = require('passport');


router.post('/create-checkout-session', auth,  async (req, res) => {

  let product_line = [];
  const cart = req.body.cartId;
  const total = req.body.total;
  const user = req.user._id;
  const cartDoc1 = await Cart.findById(cart);
  console.log(cartDoc1, "CArtDoc");
  // console.log(cartDoc1)
  productsNum = cartDoc1.products.length;
  // for await (product of cartDoc1.products ) {
  //   const foundProduct = await Product.findOne(product._id);
  //   product_line.push({price: foundProduct.stripe_id, quantity: product.quantity})
  // }
  console.log(productsNum, "PRODUCT NUM")
  const uploadPromises = cartDoc1.products.map(async (product) => {
    console.log(product, "product")
    // const foundProduct = await Product.findById(product._id);
    
    const foundProduct = await Product.findById(product.product)
    console.log(foundProduct, "foundProduct");
    product_line.push({price: foundProduct.stripe_id, quantity: product.quantity})
  });
  await Promise.all(uploadPromises)
  

  console.log("product Line", product_line)
  const session = await stripe.checkout.sessions.create({
    line_items: product_line,
    mode: 'payment',
    billing_address_collection: 'required',
    shipping_address_collection : {
      allowed_countries: ['US'],
    },
    success_url: `${YOUR_DOMAIN}/order/success/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/shop`,
  });
// console.log(session)
  res.status(200).json({
    success: true,
    // message: `Product has been added successfully!`,
    session:session.url
  });
});
router.get('/success/:orderId',auth,  async (req, res) => {

  const orderId = req.params.orderId;
  const session = await stripe.checkout.sessions.retrieve(orderId);
  // const customer = await stripe.customers.retrieve(session.customer);

  console.log("session", session);
  res.status(200).json({
    success: true,
    // message: `Product has been added successfully!`,
    session:session
  });
});

router.post('/add', auth, async (req, res) => {
  try {
    const cart = req.body.cartId;
    const total = req.body.total;
    const address = req.body.address;
    const sessionTrue = req.body.sessionTrue;
    const user = req.user._id;
    // console.log('cart',cart); 

    if(!sessionTrue) {
      res.status(400).json({
        error: 'No order Found, If you succesfully ordered, an email should be sent'
      })
    }
    // console.log(total);
    const order = new Order({
      cart,
      user,
      total,  
      address
    });

    const orderDoc = await order.save();
    const cartDoc1 = await Cart.findById(orderDoc.cart._id);
    console.log('orderDoc', orderDoc);
    console.log("total", total)
    // const session = await stripe.checkout.sessions.create({
    //   line_items: [
    //     {
    //       // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
    //       price: total,
    //       quantity: 1,
    //     },
    //   ],
    //   mode: 'payment',
    //   success_url: `${YOUR_DOMAIN}/success.html`,
    //   cancel_url: `${YOUR_DOMAIN}/cancel.html`,
    // });
    // console.log(session);
    console.log("cartDOC1", cartDoc1);
    decreaseQuantity(cartDoc1.products);
    console.log("DECREASING QUANITITY \n DECREASING QUANTITY");
    console.log("cartDOC1", cartDoc1);
    
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

// search orders api
router.get('/search', auth, async (req, res) => {
  try {
    const { search } = req.query;

    if (!Mongoose.Types.ObjectId.isValid(search)) {
      return res.status(200).json({
        orders: []
      });
    }

    let ordersDoc = null;

    if (req.user.role === ROLES.Admin) {
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search)
      }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    } else {
      const user = req.user._id;
      ordersDoc = await Order.find({
        _id: Mongoose.Types.ObjectId(search),
        user
      }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    }


    ordersDoc = ordersDoc.filter(order => order.cart);
    // console.log(ordersDoc);

    if (ordersDoc.length > 0) {
      const newOrders = ordersDoc.map(o => {
        return {
          _id: o._id,
          total: parseFloat(Number(o.total.toFixed(2))),
          created: o.created,
          products: o.cart?.products
        };
      });

      let orders = newOrders.map(o => store.caculateTaxAmount(o));
      orders.sort((a, b) => b.created - a.created);
      res.status(200).json({
        orders
      });
    } else {
      res.status(200).json({
        orders: []
      });
    }
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch orders api
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const ordersDoc = await Order.find()
      .sort('-created')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
// console.log(orderDoc);
      // for (let i=0; i < products.length; i++) {
      //   products[i].imageUrl = await getObjectSignedUrl(products[i].imageKey)
      // }

    const count = await Order.countDocuments();
    const orders = store.formatOrders(ordersDoc);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch my orders api
router.get('/me', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = req.user._id;
    const query = { user };

    const ordersDoc = await Order.find(query)
      .sort('-created')
      .populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();


      const count = await Order.countDocuments(query);
      console.log(ordersDoc.length);
  //   if (ordersDoc.cart) {
      for(let i=0; i  < ordersDoc.length; i++){ 
        // console.log(ordersDoc[i]);
      if(ordersDoc[i]?.cart?.products) {
        // console.log(i)
    for (let j=0; j < ordersDoc[i]?.cart?.products?.length; j++) {
      // console.log(ordersDoc[i].cart.products[j].product.imageKey); 
        ordersDoc[i].cart.products[j].product.imageUrl = await getObjectSignedUrl(ordersDoc[i].cart.products[j].product.imageKey)
    }
      }
      }
  // }
    // console.log(ordersDoc);
    // console.log("works")
    const orders = store.formatOrders(ordersDoc);

    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      count
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// fetch order api
router.get('/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    // const session = await stripe.checkout.sessions.retrieve(orderId);
    // if(session) {
    //   console.log(session);
    //   res.status(200).json({
    //     success: true,
    //     // message: `Product has been added successfully!`,
    //     session:session
    //   });
    // }
    let orderDoc = null;

    if (req.user.role === ROLES.Admin) {
      orderDoc = await Order.findOne({ _id: orderId }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    } else {
      const user = req.user._id;
      orderDoc = await Order.findOne({ _id: orderId, user }).populate({
        path: 'cart',
        populate: {
          path: 'products.product',
          populate: {
            path: 'brand'
          }
        }
      });
    }

    if (!orderDoc || !orderDoc.cart) {
      return res.status(404).json({
        message: `Cannot find order with the id: ${orderId}.`
      });
    }

    for(let i = 0; i < orderDoc?.cart?.products.length; i++) {
      orderDoc.cart.products[i].product.imageUrl = await getObjectSignedUrl(orderDoc.cart.products[i].product.imageKey)
    }
    console.log("docks", orderDoc);
    let order = {
      _id: orderDoc._id,
      total: orderDoc.total,
      created: orderDoc.created,
      totalTax: 0,
      products: orderDoc?.cart?.products,
      cartId: orderDoc.cart._id,
      address: orderDoc.address
    };

    order = store.caculateTaxAmount(order);

    res.status(200).json({
      order
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.delete('/cancel/:orderId', auth, async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId });
    const foundCart = await Cart.findOne({ _id: order.cart });

    increaseQuantity(foundCart.products);

    await Order.deleteOne({ _id: orderId });
    await Cart.deleteOne({ _id: order.cart });

    res.status(200).json({
      success: true
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.put('/status/item/:itemId', auth, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const orderId = req.body.orderId;
    const cartId = req.body.cartId;
    const status = req.body.status || CART_ITEM_STATUS.Cancelled;

    const foundCart = await Cart.findOne({ 'products._id': itemId });
    const foundCartProduct = foundCart.products.find(p => p._id == itemId);

    await Cart.updateOne(
      { 'products._id': itemId },
      {
        'products.$.status': status
      }
    );

    if (status === CART_ITEM_STATUS.Cancelled) {
      await Product.updateOne(
        { _id: foundCartProduct.product },
        { $inc: { quantity: foundCartProduct.quantity } }
      );

      const cart = await Cart.findOne({ _id: cartId });
      const items = cart.products.filter(
        item => item.status === CART_ITEM_STATUS.Cancelled
      );

      // All items are cancelled => Cancel order
      if (cart.products.length === items.length) {
        await Order.deleteOne({ _id: orderId });
        await Cart.deleteOne({ _id: cartId });

        return res.status(200).json({
          success: true,
          orderCancelled: true,
          message: `${
            req.user.role === ROLES.Admin ? 'Order' : 'Your order'
          } has been cancelled successfully`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Item has been cancelled successfully!'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item status has been updated successfully!'
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

const increaseQuantity = products => {
  let bulkOptions = products.map(item => {
    return {
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: item.quantity } }
      }
    };
  });

  Product.bulkWrite(bulkOptions);
};

const decreaseQuantity = products => {
  let bulkOptions = products.map(item => {
    return {
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity + 2 } }
      }
    };
  });
  console.log(bulkOptions.update);
  Product.bulkWrite(bulkOptions);
};
module.exports = router;
