const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

//event listener for the form submission
document.querySelector('#movie-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    //get user input
    const movieInput = document.querySelector('#movie-input').value;
    
    //clears input and previous results
    document.querySelector('#movie-input').value = '';
    document.querySelector('#suggestions').innerHTML = 'Loading...';

    try {
        // Request movie suggestions from OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', 
                messages: [
                    { 
                        "role": "user", 
                        "content": `Give me 6 movie suggestions similar to "${movieInput}".
                                    For each suggestion, provide the title and release year in this exact format: 
                                    "Title (Year)". No other text or description.` 
                    }
                ],
                max_tokens: 100,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        const suggestions = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
            ? data.choices[0].message.content.trim().split('\n')
            : ["No suggestions available"];

        //display suggestions with posters
        document.querySelector('#suggestions').innerHTML = `<h3>Suggestions for "${movieInput}":</h3><ul></ul>`;
        const ul = document.querySelector('#suggestions ul');

        for (let movie of suggestions) {
            const posterUrl = await getMoviePoster(movie);
            const listItem = document.createElement('li');
            listItem.innerHTML = posterUrl 
                ? `<img src="${posterUrl}" alt="${movie}" style="width: 100px; vertical-align: middle; border-radius: 8px; margin-right: 10px;"> ${movie}`
                : `${movie} (No poster found)`;
            ul.appendChild(listItem);
        }
    } catch (error) {
        console.error('Error:', error); 
        document.querySelector('#suggestions').innerHTML = 'An error occurred. Please try again.'; 
    }
});

//function to get movie poster URL from TMDB
async function getMoviePoster(movieTitle) {
    //cleans up the movie title by removing leading numbers and extra spaces
    let cleanTitle = movieTitle.replace(/^\d+\s*/, ''); // Remove leading numbers
    const match = cleanTitle.match(/^(.*)\s\((\d{4})\)$/);
    let title = cleanTitle;
    let year = '';

    if (match) {
        title = match[1].trim(); 
        year = match[2].trim();  
    }

    //normalize the title: lowercase and remove extra spaces
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    console.log(`Searching for movie: ${normalizedTitle} (${year})`);

    //call TMDB API to search for the movie with normalized title and year
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(normalizedTitle)}&year=${year}`);
    const tmdbData = await tmdbResponse.json();

    //debugging log to see the full response
    console.log("TMDB Response:", tmdbData);

    //check for results and find the most accurate match
    if (tmdbData.results && tmdbData.results.length > 0) {
        //find the closest title and year match
        const exactMatch = tmdbData.results.find(result => 
            result.title.toLowerCase() === normalizedTitle && 
            result.release_date.startsWith(year)
        );

        const bestMatch = exactMatch || tmdbData.results[0];
        const posterPath = bestMatch.poster_path;

        //return the full poster URL or null if not found
        return posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
    } else {
        return null;
    }
}
