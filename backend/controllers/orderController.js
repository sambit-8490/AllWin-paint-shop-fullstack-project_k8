const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Buyer)
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    // Validate and calculate totals
    let subtotal = 0;
    let gstTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      const itemPrice = product.price - (product.price * product.discount / 100);
      const itemGst = itemPrice * product.gst / 100;
      const itemTotal = (itemPrice + itemGst) * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        gst: itemGst * item.quantity,
        colorCode: item.colorCode || null,
        total: itemTotal
      });

      subtotal += itemPrice * item.quantity;
      gstTotal += itemGst * item.quantity;
    }

    // Delivery charge (free for orders above ₹5000)
    const deliveryCharge = subtotal >= 5000 ? 0 : 100;
    const totalAmount = subtotal + gstTotal + deliveryCharge;

    // Create order
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      shippingAddress,
      subtotal,
      gstTotal,
      deliveryCharge,
      totalAmount,
      paymentMethod,
      statusHistory: [{
        status: 'pending',
        updatedBy: req.user.id,
        note: 'Order created'
      }]
    });

    // TESTING MODE: no real payment gateway.
    // "online" orders are auto-marked as paid/confirmed instead of calling Razorpay.
    if (paymentMethod === 'online') {
      order.paymentStatus = 'paid';
      order.orderStatus = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        updatedBy: req.user.id,
        note: 'Payment auto-confirmed (test mode, no payment gateway)'
      });

      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }

      await order.save();
    }

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .sort('-createdAt')
      .populate('items.product', 'name images');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Manager, Owner)
exports.getOrders = async (req, res) => {
  try {
    let query = {};

    // Filter by status
    if (req.query.status) {
      query.orderStatus = req.query.status;
    }

    // Filter by payment status
    if (req.query.paymentStatus) {
      query.paymentStatus = req.query.paymentStatus;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit)
      .populate('user', 'name email phone')
      .populate('items.product', 'name');

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images')
      .populate('processedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized
    if (req.user.role === 'buyer' && order.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Manager, Owner)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.orderStatus = status;
    order.processedBy = req.user.id;
    order.statusHistory.push({
      status,
      updatedBy: req.user.id,
      note
    });

    // If cancelled, restore stock
    if (status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user is authorized
    if (req.user.role === 'buyer' && order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status'
      });
    }

    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      updatedBy: req.user.id,
      note: req.body.reason || 'Order cancelled by user'
    });

    // Restore stock if payment was completed
    if (order.paymentStatus === 'paid') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
