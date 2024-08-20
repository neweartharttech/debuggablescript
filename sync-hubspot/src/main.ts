const main = async () => {
  console.log('i am running async 4');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
