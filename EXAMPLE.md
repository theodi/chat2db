# Example: Using Chat2DB with a Football Results Dataset

This example shows you how to:

* Load a football results dataset into [MongoDB Atlas](https://www.mongodb.com/atlas)
* Connect the Chat2DB backend
* Ask questions and generate visual chart outputs using Assistant UI

[![Watch the video](assets/example.mp4)](assets/example.mp4)

## 1. Get the Dataset

Download the dataset from Kaggle, such as:

🔗 [International football results from 1872 to now](https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017)

After downloading, extract the CSV file (e.g. `results.csv`) and inspect it. This file typically includes columns like:

* `date`
* `home_team`
* `away_team`
* `home_score`
* `away_score`
* `tournament`
* `city`
* `country`

## 2. Set Up MongoDB Atlas

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free-tier cluster.
2. Navigate to **Database** > **Collections** and choose **Import** > **Upload File**.
3. Upload your `results.csv` and name the collection something like `results`.

   If you have a separate CSV for scorers (e.g. `goals.csv`), upload that as a second collection (e.g. `goals`).

   You can continue for the other collections/files

### Create a Read-Only AI User

1. Go to **Database Access**.
2. Create a new user called `chat2db-reader`.
3. Set their role to **read-only** on your database.
4. Set a strong password and keep it safe (you’ll use it in the backend `config.json`).

### Get Your Connection URI

Go to **Connect** → **Drivers** → Choose "Node.js" → Copy the connection string (it should look like this):

```
mongodb+srv://chat2db-reader:<password>@cluster0.mongodb.net/football?retryWrites=true&w=majority
```

Replace `<password>` with your actual password and update `config.json`.

## 3. Configure the Backend

Update your `config.json` file like so:

```json
{
  "dbType": "mongodb",
  "mongodb": {
    "uri": "mongodb+srv://chat2db-reader:YOUR_PASSWORD@cluster0.mongodb.net/football",
    "dbName": "football"
  },
  "openai": {
    "model": "gpt-4o"
  },
  "sampleSize": 5
}
```

And make sure your `.env` includes:

```
OPENAI_API_KEY=your-openai-api-key
```

Then start the backend server:

```bash
npm install
node server.js
```

It will be accessible at `http://localhost:3001/v1/chat/completions`.

## 4. Ask a Question

In the Assistant UI (see [`frontend/README.md`](frontend/README.md) for setup), ask a question like:

> Who are the top 10 goal scorers?

The assistant will:

* Interpret the question
* Generate a query
* Run it against your MongoDB
* Return a summary
* Ask if you'd like to see a chart

Respond with "yes" and you’ll get a bar chart like this:

![Chart Example](./assets/example-chart.png)