const fs = require('fs');
const sharp = require('sharp');
const Book = require('../models/Book');

exports.createBook = (req, res, next) => {
	const bookObject = JSON.parse(req.body.book);
	delete bookObject.userId;

	const buffer = req.file.buffer;
	const filename = req.file.originalname.split(' ').join('_') + Date.now() + '.webp';

	sharp(buffer)
		.webp({ quality: 20 })
		.toFile(`images/${filename}`)
		.then(() => {
			const book = new Book({
				...bookObject,
				userId: req.auth.userId,
				imageUrl: `${req.protocol}://${req.get('host')}/images/${filename}`,
			});

			book.save()
				.then(() => {
					res.status(201).json({ message: 'Object saved.' });
					console.log('New book added to database.');
				})
				.catch((error) => res.status(400).json({ error }));
		})
		.catch((error) => res.status(500).json({ error }));
};

exports.updateBook = (req, res, next) => {
	const filename = req.file && req.file.originalname.split(' ').join('_') + Date.now() + '.webp';

	const bookObject = req.file ? { ...JSON.parse(req.body.book), imageUrl: `${req.protocol}://${req.get('host')}/images/${filename}` } : { ...req.body };
	delete bookObject.userId;

	if (req.file) {
		const buffer = req.file.buffer;
		sharp(buffer)
			.webp({ quality: 20 })
			.toFile(`images/${filename}`)
			.then(() => {
				Book.findOne({ _id: req.params.id })
					.then((book) => {
						if (book.userId != req.auth.userId) {
							res.status(401).json({ message: 'Unauthorized.' });
						} else {
							const oldFilename = book.imageUrl.split('/images/')[1];

							fs.unlink(`images/${oldFilename}`, (error) => {
								if (error) throw error;
							});

							Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
								.then(() => {
									res.status(200).json({ message: 'Object updated.' });
									console.log('Book updated.');
								})
								.catch((error) => res.status(400).json({ error }));
						}
					})
					.catch((error) => res.status(400).json({ error }));
			})
			.catch((error) => res.status(500).json({ error }));
	} else {
		Book.findOne({ _id: req.params.id })
			.then((book) => {
				if (book.userId != req.auth.userId) {
					res.status(401).json({ message: 'Unauthorized.' });
				} else {
					Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
						.then(() => {
							res.status(200).json({ message: 'Object updated.' });
							console.log('Book updated.');
						})
						.catch((error) => res.status(400).json({ error }));
				}
			})
			.catch((error) => res.status(400).json({ error }));
	}
};

exports.deleteBook = (req, res, next) => {
	Book.findOne({ _id: req.params.id })
		.then((book) => {
			if (book.userId != req.auth.userId) {
				res.status(401).json({ message: 'Unauthorized.' });
			} else {
				const filename = book.imageUrl.split('/images/')[1];
				fs.unlink(`images/${filename}`, () => {
					Book.deleteOne({ _id: req.params.id })
						.then(() => {
							res.status(200).json({ message: 'Object deleted.' });
							console.log('Book deleted.');
						})
						.catch((error) => res.status(400).json({ error }));
				});
			}
		})
		.catch((error) => res.status(400).json({ error }));
};

exports.getBook = (req, res, next) => {
	Book.findOne({ _id: req.params.id })
		.then((book) => res.status(200).json(book))
		.catch((error) => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
	Book.find()
		.then((books) => res.status(200).json(books))
		.catch((error) => res.status(400).json({ error }));
};

exports.rateBook = (req, res, next) => {
	if (req.body.rating < 0 || req.body.rating > 5) {
		res.status(400).json({ message: 'Rating must be between 0 and 5.' });
		return;
	}

	Book.findOne({ _id: req.params.id })
		.then((book) => {
			if (book.ratings.find((rating) => rating.userId === req.auth.userId)) {
				res.status(400).json({ message: 'User has already rated this book.' });
				return;
			}

			const ratingObject = { userId: req.auth.userId, grade: req.body.rating };
			book.ratings.push(ratingObject);

			book.averageRating = calculateAverageRating(book.ratings);

			book.save()
				.then(() => {
					res.status(200).json(book);
					console.log('Rating added and average rating updated.');
				})
				.catch((error) => res.status(400).json({ error }));
		})
		.catch((error) => res.status(400).json({ error }));
};

exports.getBestRating = (req, res, next) => {
	Book.find()
		.sort({ averageRating: -1 })
		.then((books) => {
			const bestRatedBooks = books.slice(0, 3);
			res.status(200).json(bestRatedBooks);
		})
		.catch((error) => res.status(400).json({ error }));
};

function calculateAverageRating(ratings) {
	let totalRating = 0;

	for (const rating of ratings) {
		totalRating += rating.grade;
	}

	const averageRating = totalRating / ratings.length;
	return Math.round(averageRating);
}
