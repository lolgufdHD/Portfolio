function loadImages() {
    const gallery = document.getElementById('image-gallery');
    const folderPath = './Images/ImageGallery';

    const xhr = new XMLHttpRequest();
    xhr.open('GET', folderPath, true);

    xhr.onload = function () {
        if (xhr.status === 200) {
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(xhr.responseText, 'text/html');
            const images = Array.from(htmlDoc.querySelectorAll('a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"], a[href$=".gif"]'));

            images.forEach(image => {
                const imgElement = document.createElement('img');
                imgElement.src = image.getAttribute("href");
                gallery.appendChild(imgElement);
            });
        } else {
            console.error('Failed to load images. Status:', xhr.status);
        }
    };

    xhr.send();
}

window.onload = loadImages;
