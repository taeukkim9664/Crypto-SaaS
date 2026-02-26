const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

const getExchangeAPI = (exchange, symbol = 'BTC') => {
  const apis = {
    upbit: {
      url: `https://api.upbit.com/v1/ticker?markets=KRW-${symbol}`,
      pricePath: data => data && data[0] ? data[0].trade_price : null
    },
    bithumb: {
      url: `https://api.bithumb.com/public/ticker/${symbol}_KRW`,
      pricePath: data => data && data.data && data.data.closing_price ? parseFloat(data.data.closing_price) : null
    },
    binance: {
      url: `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`,
      pricePath: data => data && data.price ? parseFloat(data.price) : null
    },
    bybit: {
      url: `https://api.bybit.com/v2/public/tickers?symbol=${symbol}USDT`,
      pricePath: data => data && data.result && data.result[0] ? parseFloat(data.result[0].last_price) : null
    }
  };
  return apis[exchange];
};

async function getPrice(exchange, symbol) {
    const api = getExchangeAPI(exchange, symbol);
    if (!api) throw new Error(`Unsupported exchange: ${exchange}`);
    
    const response = await axios.get(api.url);
    const price = api.pricePath(response.data);

    if (price === null) {
        throw new Error(`Price data not found for ${symbol} on ${exchange}. Response: ${JSON.stringify(response.data)}`);
    }
    return price;
}

app.get('/api/kimchi-premium', async (req, res) => {
  const { domestic = 'upbit', international = 'binance', symbol = 'BTC' } = req.query;

  try {
    const [domesticPrice, internationalPrice, usdKrwRateResponse] = await Promise.all([
        getPrice(domestic, symbol),
        getPrice(international, symbol),
        axios.get('https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD')
    ]);

    const usdKrwRate = usdKrwRateResponse.data[0].basePrice;
    const premium = ((domesticPrice / (internationalPrice * usdKrwRate)) - 1) * 100;

    res.json({
      domesticExchange: domestic,
      internationalExchange: international,
      symbol,
      domesticPrice,
      internationalPrice,
      usdKrwRate,
      premium: premium.toFixed(2),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`Error fetching crypto data for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch data', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
