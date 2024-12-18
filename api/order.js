
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.static('public'));

const pizzaMenu = {
  1: {
    name: "Margherita",
    price: 9.99,
    image: "public/img/MargPizza.jpeg"
  },
  2: {
    name: "Pepperoni",
    price: 11.99,
    image: "public/img/pepspiz.jpeg"
  },
  3: {
    name: "Pasta",
    price: 12.99,
    image: "public/img/pasta.jpeg"
  },
  4: {
    name: "Lava Cake",
    price: 9.99,
    image: "public/img/lavacake.jpeg"
  },
  5: {
    name: "Prawn Pizza",
    price: 10.99,
    image: "public/img/prawn pizza.jpeg"
  },
  6: {
    name: "Cheese Pizza",
    price: 19.99,
    image: "public/img/cheese.jpeg"
  }
};

const transport = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587,
  auth: {
    user: "api",
    pass: '5d8d1e6c82408e7bf84d86ea16afccc5'
  }
});

console.log(process.env.MARI)
async function generateOrderEmail(items) {
  const orderTotal = items.reduce((total, item) => {
    return total + (pizzaMenu[item.pizzaId].price * item.quantity);
  }, 0);

  const itemsHtml = items.map(item => {
    const pizza = pizzaMenu[item.pizzaId];
    const itemTotal = pizza.price * item.quantity;
    
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${pizza.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">∰${pizza.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">∰${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const itemImages = items.map(item => {
    const pizza = pizzaMenu[item.pizzaId];
    return Array(item.quantity).fill(`
      <div style="margin-bottom: 20px;">
        <img src="cid:${pizza.name.toLowerCase().replace(/\s+/g, '-')}" 
             alt="${pizza.name}" 
             style="max-width: 200px; border-radius: 8px; display: block; margin: 0 auto;">
        <p style="text-align: center; margin-top: 10px;">
          <strong>${pizza.name}</strong>
        </p>
      </div>
    `).join('');
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="text-align: center; color: #333;">🍕 Your Virtual Pizza Order</h1>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">Order Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 10px; text-align: left;">Pizza</th>
              <th style="padding: 10px; text-align: left;">Quantity</th>
              <th style="padding: 10px; text-align: left;">Price</th>
              <th style="padding: 10px; text-align: left;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Order Total:</td>
              <td style="padding: 10px; font-weight: bold;">∰${orderTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin: 20px 0;">
        ${itemImages}
      </div>

      <p style="text-align: center; color: #666;">
        Enjoy your virtual pizzas! They're calorie-free! 🎉
      </p>
      
      <p style="text-align: center; color: #999; font-size: 12px;">
        This is a virtual delivery service. No real pizzas were harmed in the making of this email.
      </p>
    </div>
  `;
}

async function prepareAttachments(items) {
  const attachments = [];
  
  for (const item of items) {
    const pizza = pizzaMenu[item.pizzaId];
    const filename = pizza.name.toLowerCase().replace(/\s+/g, '-');
    
    const imageContent = await fs.readFile(pizza.image);
    
    attachments.push({
      filename: `${filename}.jpeg`,
      content: imageContent,
      cid: filename,
      contentType: 'image/jpeg',
      contentDisposition: 'inline'
    });
    
    for (let i = 1; i < item.quantity; i++) {
      attachments.push({
        filename: `${filename}-${i+1}.jpeg`,
        content: imageContent,
        contentType: 'image/jpeg'
      });
    }
  }
  
  return attachments;
}
function validateOrder(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.every(item => {
    return (
      item.pizzaId && 
      pizzaMenu[item.pizzaId] && 
      item.quantity && 
      Number.isInteger(item.quantity) && 
      item.quantity > 0
    );
  });
}
app.post('/api/order', async (req, res) => {
  const { email, items } = req.body;

  if (!email || !items) {
    return res.status(400).json({ 
      message: "Missing required information" 
    });
  }

  if (!validateOrder(items)) {
    return res.status(400).json({ 
      message: "Invalid order items" 
    });
  }

  try {
    const htmlContent = await generateOrderEmail(items);
    const attachments = await prepareAttachments(items);

    await transport.sendMail({
      from: '"Virtual Pizza 🍕" <pizza@pizzaprotocol.xyz>',
      to: email,
      subject: "Your Virtual Pizza Order Has Arrived! 🍕",
      html: htmlContent,
      attachments: attachments
    });

    res.json({ 
      message: "Virtual pizzas sent! Check your email 📧" 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      message: "Error delivering your virtual pizzas" 
    });
  }
});

app.get('/api/menu', (req, res) => {
  res.json(pizzaMenu);
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});