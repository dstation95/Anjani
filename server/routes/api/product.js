const express = require('express');
const router = express.Router();
const multer = require('multer');
const Mongoose = require('mongoose');
const stripe = require('stripe')('sk_test_51NkttxKiD5Z5hRRAy6joDPYMQ2X1fpeDDgY6QYjXQtjemLjyidghojsgJ82trE18LoTKFHWMmJz0OwgzQ5NUOJNi00QweRAGDR');

// Bring in Models & Utils
const Product = require('../../models/product');
const Brand = require('../../models/brand');
const Category = require('../../models/category');
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const checkAuth = require('../../utils/auth');
const { s3Upload, getObjectSignedUrl } = require('../../utils/storage');
const {
  getStoreProductsQuery,
  getStoreProductsWishListQuery
} = require('../../utils/queries');
const { ROLES } = require('../../constants');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// fetch product slug api
router.get('/item/:slug', async (req, res) => {
  try {

    const slug = req.params.slug;
    const productDoc = await Product.findOne({ slug, isActive: true }).populate(
      {
        path: 'brand',
        select: 'name isActive slug'
      }
    );

    // const hasNoBrand =
    //   productDoc?.brand === null || productDoc?.brand?.isActive === false;
      
    // if (!productDoc || hasNoBrand) {
    //   return res.status(404).json({
    //     message: 'No product found.'
    //   });
    // }

    console.log("hello")
    productDoc.imageUrl = await getObjectSignedUrl(productDoc.imageKey)
    res.status(200).json({
      product: productDoc
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch product name search api
router.get('/list/search/:name', async (req, res) => {
  try {
    const name = req.params.name;
    // console.log(req.params.name);
    // slug = "13245t"
    // const productex = await Product.findOne({ slug, isActive: true })
    // console.log(productex)
    const productDoc = await Product.find(
      { name: { $regex: new RegExp(name), $options: 'is' }, isActive: true },
      { name: 1,slug: 1, imageKey: 1, price: 1, _id: 0 }
    );
    // console.log(productDoc, "productDoc") 
    // console.log(productDoc.length, "productDoc") 
    // console.log(productDoc);
    // console.log("1", productDoc[0].imageKey);
    // productDoc.imageUrl = await getObjectSignedUrl(productDoc.imageKey);
    // console.log(productDoc[0].imageUrl)
    // if (productDoc.length <= 0) {
    //   return res.status(404).json({
    //     message: 'No product found.'
    //   });
    // }
    // console.log(productDoc[0].imageKey)
    for (let i=0; i < productDoc.length; i++) {
      productDoc[i].imageUrl = await getObjectSignedUrl(productDoc[i].imageKey)
    }
    // console.log(productDoc);

    res.status(200).json({
      products: productDoc
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch store products by advanced filters api
router.get('/list', async (req, res) => {
  // console.log('am the one')
  try {
    let {
      sortOrder,
      rating,
      max,
      min,
      category,
      page = 1,
      limit = 20
    } = req.query;
    sortOrder = JSON.parse(sortOrder);
    // console.log("car", category)
    // console.log("sortORder", sortOrder)
    const categoryFilter = category ? { category } : {};
    const basicQuery = getStoreProductsQuery(min, max, rating);
    // console.log("car", basicQuery)
    const userDoc = await checkAuth(req);
    const categoryDoc = await Category.findOne(
      { slug: categoryFilter.category, isActive: true },
      'products -_id'
    );
      // console.log("doc", categoryDoc)
    if (categoryDoc && categoryFilter !== category) {
      // console.log("123")
      basicQuery.push({
        $match: {
          isActive: true,
          _id: {
            $in: Array.from(categoryDoc.products)
          }
        }
      });
    }
    // console.log("bad", basicQuery)
    let products = null;
    const productsCount = await Product.aggregate(basicQuery);
    const count = productsCount.length;
    const size = count > 20 ? page - 1 : 0;
    const currentPage = count > 20 ? Number(page) : 1;
    // console.log("length", count)
    // console.log("length", productsCount)
    // paginate query
    const paginateQuery = [
      { $sort: sortOrder },
      { $skip: size * 20 },
      { $limit: 20 * 1 }
    ];

    if (userDoc) {
      const wishListQuery = getStoreProductsWishListQuery(userDoc.id).concat(
        basicQuery
      );
      products = await Product.aggregate(wishListQuery.concat(paginateQuery));
    } else {
      products = await Product.aggregate(basicQuery.concat(paginateQuery));
    }

    for (let i=0; i < products.length; i++) {
        products[i].imageUrl = await getObjectSignedUrl(products[i].imageKey)
      }
      // console.log(products);
      // console.log("length true", products.length) 
      console.log("count", count);
    res.status(200).json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage,
      count
    });
  } catch (error) {
    // console.log('error', error);
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// fetch store products by brand api
router.get('/list/brand/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    const brand = await Brand.findOne({ slug, isActive: true });

    if (!brand) {
      return res.status(404).json({
        message: `Cannot find brand with the slug: ${slug}.`
      });
    }

    const userDoc = await checkAuth(req);

    if (userDoc) {
      const products = await Product.aggregate([
        {
          $match: {
            isActive: true,
            brand: brand._id
          }
        },
        {
          $lookup: {
            from: 'wishlists',
            let: { product: '$_id' },
            pipeline: [
              {
                $match: {
                  $and: [
                    { $expr: { $eq: ['$$product', '$product'] } },
                    { user: new Mongoose.Types.ObjectId(userDoc.id) }
                  ]
                }
              }
            ],
            as: 'isLiked'
          }
        },
        {
          $lookup: {
            from: 'brands',
            localField: 'brand',
            foreignField: '_id',
            as: 'brands'
          }
        },
        {
          $addFields: {
            isLiked: { $arrayElemAt: ['$isLiked.isLiked', 0] }
          }
        },
        {
          $unwind: '$brands'
        },
        {
          $addFields: {
            'brand.name': '$brands.name',
            'brand._id': '$brands._id',
            'brand.isActive': '$brands.isActive'
          }
        },
        { $project: { brands: 0 } }
      ]);

      for (let i=0; i < products.length; i++) {
        // console.log(i, 'inde')
        products[i].imageUrl = await getObjectSignedUrl(products[i].imageKey)
      }

      res.status(200).json({
        products: products.reverse().slice(0, 8),
        page: 1,
        pages: products.length > 0 ? Math.ceil(products.length / 8) : 0,
        totalProducts: products.length
      });
    } else {
      const products = await Product.find({
        brand: brand._id,
        isActive: true
      }).populate('brand', 'name');

      res.status(200).json({
        products: products.reverse().slice(0, 8),
        page: 1,
        pages: products.length > 0 ? Math.ceil(products.length / 8) : 0,
        totalProducts: products.length
      });
    }
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

router.get('/url/:key', auth, async (req, res) => {
  try {
    const key = req.params.key
    const value = await getObjectSignedUrl(key)
    // const products = await Product.find({}, 'name');

    // for (let i=0; i < products.length; i++) {
    //   products[i].imageUrl = await getObjectSignedUrl(products[i].imageKey)
    // }

    res.status(200).json({
      value
    });
  } catch (error) {
    res.status(400).json({
      error: 'Image cannot be obtained For Product'
    });
  }
});

router.get('/list/select', auth, async (req, res) => {
  try {
    const products = await Product.find({}, 'name');

    for (let i=0; i < products.length; i++) {
      products[i].imageUrl = await getObjectSignedUrl(products[i].imageKey)
    }

    res.status(200).json({
      products
    });
  } catch (error) {
    res.status(400).json({
      error: 'Your request could not be processed. Please try again.'
    });
  }
});

// add product api
router.post(
  '/add',
  auth,
  role.check(ROLES.Admin, ROLES.Merchant),
  upload.single('image'),
  async (req, res, next) => {
    try {
      const sku = req.body.sku;
      const name = req.body.name;
      const description = req.body.description;
      const quantity = req.body.quantity;
      const price = req.body.price;
      const taxable = req.body.taxable;
      const isActive = req.body.isActive;
      const brand = req.body.brand;
      const images = req.file;
      
      // console.log('body', req.body)
      if (!sku) {
        return res.status(400).json({ error: 'You must enter sku.' });
      }

      if (!description || !name) {
        return res
          .status(400)
          .json({ error: 'You must enter description & name.' });
      }

      if (!quantity) {
        return res.status(400).json({ error: 'You must enter a quantity.' });
      }

      if (!price) {
        return res.status(400).json({ error: 'You must enter a price.' });
      }

      const foundProduct = await Product.findOne({ sku });

      if (foundProduct) {
        return res.status(400).json({ error: 'This sku is already in use.' });
      }

    //  console.log(req.body)

    //  return
      const { imageKeys, imageKey } = await s3Upload(images);
      // console.log(imageKey, "imagekey second");

      const newPrice = price * 100
      const stripe_product = await stripe.products.create({
        name: name,
        default_price_data: {
          unit_amount: newPrice,
          currency: 'usd',
        },
        expand: ['default_price'],
      });

      const stripe_price = await stripe.prices.create({
        product: stripe_product.id,
        unit_amount: newPrice,
        currency: 'usd',
      });

      console.log("key", imageKey)
      const imageUrl = await getObjectSignedUrl(imageKey);
      console.log("key", imageUrl);
      const product = new Product({
        sku,
        name,
        description,
        quantity,
        price,
        taxable,
        isActive,
        brand,
        imageUrl,
        stripe_id: stripe_price.id,
        imageKey: imageKey,
        imgIds: imageKeys
      });


      
      const savedProduct = await product.save();

      res.status(200).json({
        success: true,
        message: `Product has been added successfully!`,
        product: savedProduct
      });
    } catch (error) {
      next(new Error(`Error: ${error.message, error.stack}`));
      return res.status(400).json({
        error: 'Your request could not be processed. Please try again.'
      });r
    }
  }
);

// fetch products api
router.get(
  '/',
  auth,
  role.check(ROLES.Admin, ROLES.Merchant),
  async (req, res, next) => {
    try {
      let products = [];

      if (req.user.merchant) {
        const brands = await Brand.find({
          merchant: req.user.merchant
        }).populate('merchant', '_id');

        const brandId = brands[0]?.['_id'];

        products = await Product.find({})
          .populate({
            path: 'brand',
            populate: {
              path: 'merchant',
              model: 'Merchant'
            }
          })
          .where('brand', brandId);
      } else {
        products = await Product.find({}).populate({
          path: 'brand',
          populate: {
            path: 'merchant',
            model: 'Merchant'
          }
        });
      }

      for (let i=0; i < products.length; i++) {
        // console.log(products[i], "products");
        products[i].imageUrl = await getObjectSignedUrl(products[i].imageKey)
      }

      res.status(200).json({
        products
      });
    } catch (error) {
      next(new Error(`Error: ${error.message, error.stack}`));
      res.status(400).json({
        error: 'Your request could not be processed. Please try again.'
      });
    }
  }
);

// fetch product api
router.get(
  '/:id',
  auth,
  role.check(ROLES.Admin, ROLES.Merchant),
  async (req, res) => {
    try {
      const productId = req.params.id;
      // throw new Error("failed");
      console.log("product_id",productId )
      let productDoc = null;

      if (req.user.merchant) {
        const brands = await Brand.find({
          merchant: req.user.merchant
        }).populate('merchant', '_id');

        const brandId = brands[0]['_id'];

        productDoc = await Product.findOne({ _id: productId })
          .populate({
            path: 'brand',
            select: 'name'
          })
          .where('brand', brandId);
      } else {
        productDoc = await Product.findOne({ _id: productId }).populate({
          path: 'brand',
          select: 'name'
        });
      }

      if (!productDoc) {
        return res.status(404).json({
          message: 'No product found.'
        });
      }

      res.status(200).json({
        product: productDoc
      });
    } catch (error) {
      res.status(400).json({
        error: 'Your request could not be processed. Please try again.'
      });
    }
  }
);

router.put(
  '/:id',
  auth,
  role.check(ROLES.Admin, ROLES.Merchant),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const update = req.body.product;
      const query = { _id: productId };
      const { sku, slug } = req.body.product;

      const foundProduct = await Product.findOne({
        $or: [{ slug }, { sku }]
      });

      if (foundProduct && foundProduct._id != productId) {
        return res
          .status(400)
          .json({ error: 'Sku or slug is already in use.' });
      }

      await Product.findOneAndUpdate(query, update, {
        new: true
      });

      res.status(200).json({
        success: true,
        message: 'Product has been updated successfully!'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Your request could not be processed. Please try again.'
      });
    }
  }
);

router.put(
  '/:id/active',
  auth,
  role.check(ROLES.Admin, ROLES.Merchant),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const update = req.body.product;
      const query = { _id: productId };

      await Product.findOneAndUpdate(query, update, {
        new: true
      });

      res.status(200).json({
        success: true,
        message: 'Product has been updated successfully!'
      });
    } catch (error) {
      res.status(400).json({
        error: 'Your request could not be processed. Please try again.'
      });
    }
  }
);

router.delete(
  '/delete/:id',
  auth,
  role.check(ROLES.Admin, ROLES.Merchant),
  async (req, res) => {
    try {
      const product = await Product.deleteOne({ _id: req.params.id });

      res.status(200).json({
        success: true,
        message: `Product has been deleted successfully!`,
        product
      });
    } catch (error) {
      res.status(400).json({
        error: 'Your request could not be processed. Please try again.'
      });
    }
  }
);

module.exports = router;