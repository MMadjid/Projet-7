const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = (req, res, next) => {
	const emailFormat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
	const passwordFormat = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

	if (!req.body.email.match(emailFormat)) {
		res.status(400).json({ message: 'Invalid email.' });
		return;
	}

	if (!req.body.password.match(passwordFormat)) {
		res.status(400).json({ message: 'Password must be at least eight characters long and contain at least one lowercase character, one uppercase character, and one digit.' });
		return;
	}

	bcrypt
		.hash(req.body.password, 10)
		.then((hash) => {
			const user = new User({
				email: req.body.email,
				password: hash,
			});
			user.save()
				.then(() => {
					res.status(201).json({ message: 'User created.' });
					console.log('New user added to database.');
				})
				.catch((error) => res.status(400).json({ error }));
		})
		.catch((error) => res.status(500).json({ error }));
};

exports.login = (req, res, next) => {
	User.findOne({ email: req.body.email })
		.then((user) => {
			if (user === null) {
				res.status(401).json({ message: 'Wrong email or password.' });
			} else {
				bcrypt
					.compare(req.body.password, user.password)
					.then((valid) => {
						if (!valid) {
							res.status(401).json({ message: 'Wrong email or password.' });
						} else {
							res.status(200).json({
								userId: user._id,
								token: jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '24h' }),
							});
							console.log('User logged in.');
						}
					})
					.catch((error) => res.status(500).json({ error }));
			}
		})
		.catch((error) => res.status(500).json({ error }));
};
