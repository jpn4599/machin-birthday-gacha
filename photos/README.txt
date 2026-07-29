📷 二人の写真の入れ方
=====================

1. このフォルダ（photos/）に写真を入れる
   例: photo1.jpg, photo2.jpg, futari.jpg など名前は自由

2. script.js の一番上にある PHOTOS 配列にパスを追記する

   const PHOTOS = [
     'photos/photo1.jpg',
     'photos/photo2.jpg',
   ];

これだけで、ガチャのカプセル上半分にランダムで写真が表示されます。
写真が無い間は絵文字プレースホルダーで動きます。

💌 メッセージの差し替えも script.js 冒頭の MESSAGES 配列を
編集するだけでOKです。
