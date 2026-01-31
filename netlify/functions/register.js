exports.handler = async (event, context) => {
  // Simple register function - in real app, use proper auth
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const { name, email, password } = JSON.parse(event.body);

  // Dummy check - in real app, save to database
  if (email && password && name) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Registration successful', user: { name, email } })
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid data' })
    };
  }
};
