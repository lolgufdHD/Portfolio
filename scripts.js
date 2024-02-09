        // Function to fetch images from a folder and display them in the gallery
        function loadImages() {
            const gallery = document.getElementById('image-gallery');
            
            // Replace 'path/to/your/images/folder' with the path to your images folder
            const folderPath = './Images/image-gallery';
        
            fetch(folderPath)
              .then(response => response.text())
              .then(data => {
                // Parse the HTML content of the folder
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(data, 'text/html');
        
                // Get all image files in the folder
                const images = Array.from(htmlDoc.querySelectorAll('a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"], a[href$=".gif"]'));
        
                // Create and append image elements to the gallery
                images.forEach(image => {
                  const imageUrl = folderPath + '/' + image.getAttribute('href');
                  const imgElement = document.createElement('img');
                  imgElement.src = imageUrl;
                  gallery.appendChild(imgElement);
                });
              })
              .catch(error => console.error('Error fetching images:', error));
          }
        
          // Call the loadImages function when the page loads
          window.onload = loadImages;