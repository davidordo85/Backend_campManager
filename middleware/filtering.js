const { queryCapitalized } = require("../utils/StringTransformation")
const Camps = require('../_data/camps.json')

const filtering = (model) => async (req, res, next) => {
  let query

  // Filtering
  const reqQuery = { ...req.query }
  const removeFields = ['select', 'sort', 'page', 'limit']
  removeFields.forEach(param => delete reqQuery[param])
 
  let queryStr = JSON.stringify(reqQuery)
  queryStr = queryStr.replace(/\b(in)\b/g, match => `$${match}`)
  query = model.find(JSON.parse(queryStr))
  console.log(req.query,'request babe')

  //Request transformations
  if(req.query) {
    //TODO:Cuándo hay un substring que coincide con más de un campamento, sólo me devuelve uno (ej. MALTA) ver condidiones OR en Mongoose para que me devuelva todo
    const queryTransformed = queryCapitalized(reqQuery)
    let result = {}
    if(req.query.location && req.query.name){
      data = Camps.filter(camp => camp.location.includes(queryTransformed.location) && camp.name.includes(queryTransformed.name))
      data.forEach(camp => result=Object.assign({'location':camp.location, 'name':camp.name}))
      let resultStr = JSON.stringify(result)
      query=model.find(JSON.parse(resultStr))
    } else if(req.query.location && !req.query.name) {
      data = Camps.filter(camp => camp.location.includes(queryTransformed.location))
      data.forEach(camp => result=Object.assign({'location':camp.location}))
      let resultStr = JSON.stringify(result)
      query=model.find(JSON.parse(resultStr))
    } else if(req.query.name && !req.query.location) {
      data = Camps.filter(camp => camp.name.includes(queryTransformed.name))
      data.forEach(camp => result=Object.assign({'name':camp.name}))
      //console.log(result,'result')
      let resultStr = JSON.stringify(result)
      query=model.find(JSON.parse(resultStr))
      //console.log(query,'tu quien eres query')
    } else {
      let queryStr = JSON.stringify(queryTransformed)
      query = model.find(JSON.parse(queryStr))
    }
  }

  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ')
    query = query.select(fields)
  }

  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ')
    query = query.sort(sortBy)
  } else {
    query = query.sort('-createdAt')
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 5
  const startIndex = (page - 1) * limit
  const endIndex = page * limit
  const total = await model.countDocuments()

  query = query.skip(startIndex).limit(limit)

  // Executing query
  const results = await query

  // Pagination result
  const pagination = {}

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    }
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    }
  }

  res.filtering = {
    sucess: true,
    count: results.length,
    pagination,
    data: results
  }

  next()
} 

module.exports = filtering