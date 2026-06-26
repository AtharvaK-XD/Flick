import { motion } from 'framer-motion';

export function Loader() {
  return (
    <div className="flex justify-center items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{
            scale: [0.7, 1.3, 0.7],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default Loader;
