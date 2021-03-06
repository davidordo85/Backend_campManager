const crypto = require('crypto')
const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')
const sendEmail = require('../utils/sendEmail')
const User = require('../models/User')
const { capitalizeID } = require('../utils/capitalizeID') 

/**
 * @route   POST api/v1/auth/register
 * @desc    Auth user & get token
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  if(req.body.idNumber) {
    req.body.idNumber = capitalizeID(req.body.idNumber)
  }

  const user = new User(req.body)
  const userSaved = await user.save()
  res.status(201).json({ success: true, data: userSaved })

  sendTokenResponse(user, 200, res)
})

/**
 * @route   POST api/v1/auth/login
 * @desc    Auth user & get token
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body

  // validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please enter a valid email & password'), 400)
  }

  // check for user
  const user = await User.findOne({ email }).select('+password')
  const role = user.role

  if (!user) {
    return next(new ErrorResponse('Invalid credentials'), 401)
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password)

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials'), 401)
  }

  sendTokenResponse(user, role, 200, res)
})

/**
 * @route   GET api/v1/auth/me
 * @desc    Get current logged in user
 * @access  Private
 * @role    admin/guest/helper
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)

  res.status(200).json({ success: true, data: user })
})

/**
 * @route   GET api/v1/auth/logout
 * @desc    Log user out & destroy cookie
 * @access  Private
 * @role    admin/guest/helper
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  })

  res.status(200).json({ success: true, data: {} })
})

/**
 * @route   POST api/v1/auth/forgotpassword
 * @desc    Forgot password
 * @access  Public
 * @role    admin/guest/helper
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email })

  if(req.body.email === '') {
    return next(new ErrorResponse('Email can not be empty'), 404)
  } else if (!user) {
    return next(new ErrorResponse('There is no user with that email'), 404)
  }

  const resetToken = user.getResetPasswordToken()
  await user.save({ validateBeforeSave: true })
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/auth/resetpassword/${resetToken}`
  const message = `You requested the reset password. For REST API make a PUT request to: \n\n ${resetUrl}`

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message,
    })
    res.status(200).json({ success: true, data: 'Email sent' })
  } catch (error) {
    console.log(error)
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined

    await user.save({ validateBeforeSave: false })
    return next(new ErrorResponse('Email could not be sent', 500))
  }
})

/**
 * @route   PUT api/v1/auth/resetpassword/:resettoken
 * @desc    Reset password
 * @access  Public
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex')

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    next(new ErrorResponse('Invalid token', 400))
  }

  user.password = req.body.password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  sendTokenResponse(user, 200, res)
})

// Get token from model, create cookie and send response
const sendTokenResponse = (user, role, statusCode, res) => {
  // Create user with method lowercase not a static uppercase
  const token = user.getSignJWtToken()

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  }

  if (process.env.NODE_ENV === 'production') {
    options.secure = true
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    role
  })
}
