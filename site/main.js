$( document ).ready(function() {
    $.get("/getImages", function(data) {
        var images = JSON.parse(data)["images"];
        for (i = 0; i < images.length; i++) {
            document.getElementById("imgGallery").innerHTML += "<a href=\"media/imageGallery" + images[i] + "\"> <image src=\"media/imageGallery/" + images[i] + "\"/></a>";
        }
    });
});