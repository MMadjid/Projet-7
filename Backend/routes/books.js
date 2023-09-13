const express = require('express');
const booksController = require('../controllers/books');
const auth = require('../middlewares/auth');
const multer = require('../middlewares/multer-config');

const router = express.Router();

router.post('/', auth, multer, booksController.createBook);
router.put('/:id', auth, multer, booksController.updateBook);
router.delete('/:id', auth, booksController.deleteBook);
router.get('/bestrating', booksController.getBestRating);
router.get('/:id', booksController.getBook);
router.get('/', booksController.getAllBooks);
router.post('/:id/rating', auth, booksController.rateBook);

module.exports = router;
